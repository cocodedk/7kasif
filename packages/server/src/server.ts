import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { ConnectionManager } from './rooms/ConnectionManager.js';
import { RoomManager } from './rooms/RoomManager.js';
import { MessageHandler } from './rooms/MessageHandler.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const CLIENT_DIR = resolve(process.env.CLIENT_DIR || join(import.meta.dirname, '../../client/dist'));

const connections = new ConnectionManager();
const rooms = new RoomManager();
const handler = new MessageHandler(connections, rooms);

const server = createServer((req, res) => {
  // Serve static client files
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
});

const wss = new WebSocketServer({ server, path: '/ws' });

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

server.listen(PORT, () => {
  console.log(`Hafte Kasif server running on port ${PORT}`);
});

export { server, wss };
