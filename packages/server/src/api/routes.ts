import type { IncomingMessage, ServerResponse } from 'http';
import { createUser, sendMagicLink, verifyMagicToken, verifyToken } from '../auth/auth.js';
import { getLeaderboard, getPlayerStats, getTournamentHistory } from '../db/leaderboard.js';

const CORS_ORIGIN = process.env.CORS_ORIGIN || 'https://cocodedk.github.io';

function setCorsHeaders(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function json(res: ServerResponse, statusCode: number, data: unknown): void {
  setCorsHeaders(res);
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

const MAX_BODY_BYTES = 1_048_576;

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    let bytes = 0;
    req.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > MAX_BODY_BYTES) {
        req.destroy(new Error('Request body too large'));
        return;
      }
      body += chunk;
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function getAdminFromHeader(req: IncomingMessage): { userId: number; email: string } | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const decoded = verifyToken(auth.slice(7));
    if (decoded.role !== 'admin') return null;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Handle API routes. Returns true if the request was handled, false otherwise.
 */
export async function handleApiRoute(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  const url = req.url || '';
  const method = req.method || 'GET';

  // CORS preflight
  if (method === 'OPTIONS' && url.startsWith('/api/')) {
    setCorsHeaders(res);
    res.writeHead(204);
    res.end();
    return true;
  }

  if (url === '/api/auth/send-link' && method === 'POST') {
    try {
      const body = JSON.parse(await readBody(req));
      await sendMagicLink(body.email);
      json(res, 200, { ok: true });
    } catch {
      // Always return 200 to prevent email enumeration
      json(res, 200, { ok: true });
    }
    return true;
  }

  if (url === '/api/auth/verify' && method === 'POST') {
    let body: any;
    try {
      body = JSON.parse(await readBody(req));
    } catch {
      json(res, 400, { error: 'Invalid JSON body' });
      return true;
    }
    try {
      const result = await verifyMagicToken(body.token);
      json(res, 200, result);
    } catch {
      json(res, 401, { error: 'Invalid token' });
    }
    return true;
  }

  if (url === '/api/admin/create-user' && method === 'POST') {
    const admin = getAdminFromHeader(req);
    if (!admin) {
      json(res, 403, { error: 'Admin access required' });
      return true;
    }
    try {
      const body = JSON.parse(await readBody(req));
      const user = await createUser(body.email, body.displayName);
      await sendMagicLink(body.email, true);
      json(res, 201, { user });
    } catch (err: any) {
      console.error('Admin create-user error:', err);
      json(res, 400, { error: 'Bad request' });
    }
    return true;
  }

  if (url === '/api/leaderboard' && method === 'GET') {
    try {
      const leaderboard = await getLeaderboard();
      json(res, 200, leaderboard);
    } catch (err: any) {
      console.error('Leaderboard error:', err);
      json(res, 500, { error: 'Failed to fetch leaderboard', detail: err.message });
    }
    return true;
  }

  if (url === '/api/tournaments' && method === 'GET') {
    try {
      const tournaments = await getTournamentHistory();
      json(res, 200, tournaments);
    } catch (err: any) {
      json(res, 500, { error: 'Failed to fetch tournaments' });
    }
    return true;
  }

  // /api/players/:id/stats
  const playerStatsMatch = url.match(/^\/api\/players\/(\d+)\/stats$/);
  if (playerStatsMatch && method === 'GET') {
    try {
      const userId = parseInt(playerStatsMatch[1], 10);
      const stats = await getPlayerStats(userId);
      if (!stats) {
        json(res, 404, { error: 'Player not found' });
      } else {
        json(res, 200, stats);
      }
    } catch (err: any) {
      json(res, 500, { error: 'Failed to fetch player stats' });
    }
    return true;
  }

  return false;
}
