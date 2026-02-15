import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { vi } from 'vitest';
import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'http';
import { getTestPool, initTestDb, cleanTestDb, closeTestDb } from '../auth/test-db.js';

vi.mock('../../auth/db.js', () => {
  return {
    getPool: () => getTestPool(),
  };
});

import { handleApiRoute } from '../../api/routes.js';
import { register } from '../../auth/auth.js';
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

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-for-api';
  await initTestDb();
  port = await startServer();
});

beforeEach(async () => {
  await cleanTestDb();
  // Seed an admin user for tests that need it
  const result = await register('admin', 'adminpass123', 'Admin', 'admin');
  adminToken = result.token;
});

afterAll(async () => {
  server.close();
  await closeTestDb();
});

describe('POST /api/register (removed)', () => {
  it('should return 404 — public registration is disabled', async () => {
    const res = await fetchApi('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'alice',
        password: 'password123',
        displayName: 'Alice',
      }),
    });
    expect(res.status).toBe(404);
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
      body: JSON.stringify({
        username: 'alice',
        password: 'password123',
        displayName: 'Alice',
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.user.username).toBe('alice');
    expect(body.user.displayName).toBe('Alice');
    expect(body.user.role).toBe('player');
    expect(body.token).toBeTruthy();
  });

  it('should reject when no auth header is provided', async () => {
    const res = await fetchApi('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'alice',
        password: 'password123',
        displayName: 'Alice',
      }),
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Admin access required');
  });

  it('should reject when called by a non-admin player', async () => {
    // Create a regular player first
    const playerResult = await register('player1', 'playerpass123', 'Player');
    const playerToken = playerResult.token;

    const res = await fetchApi('/api/admin/create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${playerToken}`,
      },
      body: JSON.stringify({
        username: 'alice',
        password: 'password123',
        displayName: 'Alice',
      }),
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Admin access required');
  });

  it('should return 400 for duplicate username', async () => {
    await fetchApi('/api/admin/create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        username: 'alice',
        password: 'password123',
        displayName: 'Alice',
      }),
    });

    const res = await fetchApi('/api/admin/create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        username: 'alice',
        password: 'differentpass',
        displayName: 'Alice2',
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('already taken');
  });
});

describe('POST /api/login', () => {
  beforeEach(async () => {
    // Create a player via admin endpoint
    await register('alice', 'password123', 'Alice');
  });

  it('should login and return 200 with JWT', async () => {
    const res = await fetchApi('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'alice',
        password: 'password123',
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.username).toBe('alice');
    expect(body.token).toBeTruthy();
  });

  it('should return 401 for wrong password', async () => {
    const res = await fetchApi('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'alice',
        password: 'wrongpassword',
      }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('Invalid');
  });
});

describe('GET /api/leaderboard', () => {
  it('should return public leaderboard data', async () => {
    // Seed some data
    const pool = getTestPool();
    const userResult = await pool.query(
      "INSERT INTO users (username, password_hash, display_name) VALUES ('leaderuser', 'hash', 'LeaderUser') RETURNING id",
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
      "INSERT INTO users (username, password_hash, display_name) VALUES ('bob', 'hash', 'Bob') RETURNING id",
    );
    const userId = userResult.rows[0].id;

    const sessionId = await saveTournament('s1', 'AAAA', 'standard');
    await saveSessionPlayers(sessionId, [{ userId, playerName: 'Bob' }]);
    await endTournament(sessionId);

    const res = await fetchApi(`/api/players/${userId}/stats`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.username).toBe('bob');
    expect(body.displayName).toBe('Bob');
  });

  it('should return 404 for non-existent player', async () => {
    const res = await fetchApi('/api/players/9999/stats');
    expect(res.status).toBe(404);
  });
});
