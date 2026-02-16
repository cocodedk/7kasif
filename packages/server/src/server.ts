import { WebSocketServer } from 'ws';
import { createServer, request as httpRequest } from 'http';
import { createConnection } from 'net';
import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { ConnectionManager } from './rooms/ConnectionManager.js';
import { RoomManager } from './rooms/RoomManager.js';
import { MessageHandler } from './rooms/MessageHandler.js';
import { handleApiRoute } from './api/routes.js';
import { createUser } from './auth/auth.js';
import { getPool } from './auth/db.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const CLIENT_DIR = resolve(process.env.CLIENT_DIR || join(import.meta.dirname, '../../client/dist'));
const VITE_DEV_URL = process.env.VITE_DEV_URL; // e.g. 'http://client:5173'

const connections = new ConnectionManager();
const rooms = new RoomManager();
const handler = new MessageHandler(connections, rooms);

function proxyToVite(req: import('http').IncomingMessage, res: import('http').ServerResponse): void {
  const url = new URL(VITE_DEV_URL!);
  const proxyReq = httpRequest(
    {
      hostname: url.hostname,
      port: url.port,
      path: req.url,
      method: req.method,
      headers: req.headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );
  proxyReq.on('error', () => {
    res.writeHead(502);
    res.end('Vite dev server unavailable');
  });
  req.pipe(proxyReq);
}

function serveStatic(req: import('http').IncomingMessage, res: import('http').ServerResponse): void {
  const url = req.url === '/' ? '/index.html' : req.url!;
  const filePath = join(CLIENT_DIR, url);

  if (existsSync(filePath)) {
    const ext = filePath.split('.').pop();
    const contentType: Record<string, string> = {
      html: 'text/html',
      js: 'application/javascript',
      css: 'text/css',
      json: 'application/json',
      png: 'image/png',
      svg: 'image/svg+xml',
      ico: 'image/x-icon',
      webmanifest: 'application/manifest+json',
    };

    res.writeHead(200, { 'Content-Type': contentType[ext!] || 'application/octet-stream' });
    res.end(readFileSync(filePath));
  } else {
    // SPA fallback
    const indexPath = join(CLIENT_DIR, 'index.html');
    if (existsSync(indexPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(readFileSync(indexPath));
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  }
}

const server = createServer(async (req, res) => {
  // Handle API routes first
  if (req.url?.startsWith('/api/')) {
    try {
      const handled = await handleApiRoute(req, res);
      if (handled) return;
    } catch {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
      return;
    }
  }

  // In dev mode, proxy to Vite; in production, serve static files
  if (VITE_DEV_URL) {
    proxyToVite(req, res);
  } else {
    serveStatic(req, res);
  }
});

const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  if (req.url === '/ws') {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  } else if (VITE_DEV_URL) {
    // Proxy Vite HMR WebSocket
    const url = new URL(VITE_DEV_URL);
    const proxy = createConnection({ host: url.hostname, port: parseInt(url.port) }, () => {
      const reqLine = `GET ${req.url} HTTP/1.1\r\n`;
      const headers = Object.entries(req.headers)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\r\n');
      proxy.write(reqLine + headers + '\r\n\r\n');
      proxy.write(head);
      socket.pipe(proxy).pipe(socket);
    });
    proxy.on('error', () => socket.destroy());
    socket.on('error', () => proxy.destroy());
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    handler.handleMessage(ws, data.toString());
  });

  ws.on('close', () => {
    connections.remove(ws);
  });

  ws.on('error', () => {
    connections.remove(ws);
  });
});

// Cleanup stale rooms and connections every 5 minutes
setInterval(() => {
  rooms.cleanup();
  connections.cleanup();
}, 5 * 60 * 1000);

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const name = process.env.ADMIN_NAME || 'Admin';
  if (!email) return;

  try {
    const pool = getPool();
    const existing = await pool.query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['admin']);
    if (existing.rows.length > 0) return;

    const user = await createUser(email, name, 'admin');
    console.log(`Admin seeded: ${user.email} (id: ${user.id})`);
  } catch (err: any) {
    console.error(`Admin seed failed: ${err.message}`);
  }
}

server.listen(PORT, async () => {
  console.log(`Hafte Kasif server running on port ${PORT}`);
  await seedAdmin();
});

export { server, wss };
