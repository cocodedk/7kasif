import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { vi } from 'vitest';
import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'http';
import { getTestPool, initTestDb, cleanTestDb, closeTestDb } from '../auth/test-db.js';

vi.mock('../../auth/db.js', () => {
  return {
    getPool: () => getTestPool(),
  };
});

vi.mock('../../auth/email.js', () => {
  return {
    sendEmail: vi.fn().mockResolvedValue(undefined),
    buildMagicLinkEmail: vi.fn().mockReturnValue({ subject: 'test', html: '<p>test</p>' }),
  };
});

import { handleApiRoute } from '../../api/routes.js';
import { createUser, sendMagicLink, verifyMagicToken } from '../../auth/auth.js';
import { saveTournament, saveSessionPlayers, endTournament, saveScores } from '../../db/tournaments.js';
import type { PlayerScore } from '@hafte-kasif/shared';

let server: Server;
let port: number;

function startServer(): Promise<number> {
  return new Promise((resolve) => {
    server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      const handled = await handleApiRoute(req, res);
      if (!handled) {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    server.listen(0, () => {
      const addr = server.address();
      resolve(typeof addr === 'object' ? addr!.port : 0);
    });
  });
}

async function fetchApi(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`http://localhost:${port}${path}`, options);
}

let adminToken: string;

async function getAdminToken(): Promise<string> {
  const user = await createUser('admin@test.com', 'Admin', 'admin');
  await sendMagicLink('admin@test.com');
  const pool = getTestPool();
  const tokenResult = await pool.query('SELECT token FROM magic_tokens WHERE user_id = $1', [user.id]);
  const result = await verifyMagicToken(tokenResult.rows[0].token);
  return result.token;
}

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-for-api';
  process.env.APP_URL = 'http://localhost:3000';
  await initTestDb();
  port = await startServer();
});

beforeEach(async () => {
  await cleanTestDb();
  adminToken = await getAdminToken();
});

afterAll(async () => {
  server?.close();
  await closeTestDb();
});

describe('POST /api/login (removed)', () => {
  it('should return 404 — old login endpoint is gone', async () => {
    const res = await fetchApi('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'alice', password: 'password123' }),
    });
    expect(res.status).toBe(404);
  });
});

describe('POST /api/register (removed)', () => {
  it('should return 404 — public registration is disabled', async () => {
    const res = await fetchApi('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alice@test.com', displayName: 'Alice' }),
    });
    expect(res.status).toBe(404);
  });
});

describe('POST /api/auth/send-link', () => {
  it('should return 200 for existing user', async () => {
    await createUser('alice@test.com', 'Alice');
    const res = await fetchApi('/api/auth/send-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alice@test.com' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('should return 200 even for unknown email (no enumeration)', async () => {
    const res = await fetchApi('/api/auth/send-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'unknown@test.com' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});

describe('POST /api/auth/verify', () => {
  it('should verify a valid magic token', async () => {
    const user = await createUser('alice@test.com', 'Alice');
    await sendMagicLink('alice@test.com');

    const pool = getTestPool();
    const tokenResult = await pool.query('SELECT token FROM magic_tokens WHERE user_id = $1', [user.id]);

    const res = await fetchApi('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: tokenResult.rows[0].token }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.email).toBe('alice@test.com');
    expect(body.token).toBeTruthy();
  });

  it('should return 401 for invalid token', async () => {
    const res = await fetchApi('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'invalid-token' }),
    });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/admin/create-user', () => {
  it('should create a user when called by admin', async () => {
    const res = await fetchApi('/api/admin/create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ email: 'alice@test.com', displayName: 'Alice' }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.user.email).toBe('alice@test.com');
    expect(body.user.displayName).toBe('Alice');
    expect(body.user.role).toBe('player');
  });

  it('should reject when no auth header is provided', async () => {
    const res = await fetchApi('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alice@test.com', displayName: 'Alice' }),
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Admin access required');
  });

  it('should reject when called by a non-admin player', async () => {
    const player = await createUser('player@test.com', 'Player');
    await sendMagicLink('player@test.com');
    const pool = getTestPool();
    const tokenResult = await pool.query('SELECT token FROM magic_tokens WHERE user_id = $1', [player.id]);
    const { token: playerToken } = await verifyMagicToken(tokenResult.rows[0].token);

    const res = await fetchApi('/api/admin/create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${playerToken}`,
      },
      body: JSON.stringify({ email: 'alice@test.com', displayName: 'Alice' }),
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Admin access required');
  });

  it('should return 400 for duplicate email', async () => {
    await fetchApi('/api/admin/create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ email: 'alice@test.com', displayName: 'Alice' }),
    });

    const res = await fetchApi('/api/admin/create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ email: 'alice@test.com', displayName: 'Alice2' }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('already registered');
  });
});

describe('GET /api/leaderboard', () => {
  it('should return public leaderboard data', async () => {
    const pool = getTestPool();
    const userResult = await pool.query(
      "INSERT INTO users (email, display_name) VALUES ('leaderuser@test.com', 'LeaderUser') RETURNING id",
    );
    const userId = userResult.rows[0].id;

    const sessionId = await saveTournament('s1', 'AAAA', 'standard');
    await saveSessionPlayers(sessionId, [{ userId, playerName: 'LeaderUser' }]);
    const scores: PlayerScore[] = [{
      playerId: `user_${userId}`,
      playerName: 'LeaderUser',
      rows: [{ cells: ['I', 'I', 'I', 'I'] }],
      plusClusters: 1,
      minusClusters: 0,
      netScore: 1,
    }];
    await saveScores(sessionId, scores, new Map([['user_' + userId, userId]]));
    await endTournament(sessionId);

    const res = await fetchApi('/api/leaderboard');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(1);
  });
});

describe('GET /api/tournaments', () => {
  it('should return tournament history', async () => {
    const sessionId = await saveTournament('s1', 'AAAA', 'standard');
    await saveSessionPlayers(sessionId, [{ userId: null, playerName: 'Alice' }]);
    await endTournament(sessionId);

    const res = await fetchApi('/api/tournaments');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(1);
    expect(body[0].sessionCode).toBe('s1');
  });
});

describe('GET /api/players/:id/stats', () => {
  it('should return player stats', async () => {
    const pool = getTestPool();
    const userResult = await pool.query(
      "INSERT INTO users (email, display_name) VALUES ('bob@test.com', 'Bob') RETURNING id",
    );
    const userId = userResult.rows[0].id;

    const sessionId = await saveTournament('s1', 'AAAA', 'standard');
    await saveSessionPlayers(sessionId, [{ userId, playerName: 'Bob' }]);
    await endTournament(sessionId);

    const res = await fetchApi(`/api/players/${userId}/stats`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.email).toBe('bob@test.com');
    expect(body.displayName).toBe('Bob');
  });

  it('should return 404 for non-existent player', async () => {
    const res = await fetchApi('/api/players/9999/stats');
    expect(res.status).toBe(404);
  });
});
