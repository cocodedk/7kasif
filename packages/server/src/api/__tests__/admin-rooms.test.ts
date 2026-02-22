import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IncomingMessage, ServerResponse } from 'http';
import { EventEmitter } from 'events';
import { handleApiRoute } from '../routes.js';
import { RoomManager } from '../../rooms/RoomManager.js';
import { ConnectionManager } from '../../rooms/ConnectionManager.js';

// Mock auth module
vi.mock('../../auth/auth.js', () => ({
  createUser: vi.fn(),
  sendMagicLink: vi.fn(),
  verifyMagicToken: vi.fn(),
  verifyToken: vi.fn((token: string) => {
    if (token === 'valid-admin-token') {
      return { userId: 1, email: 'admin@test.com', role: 'admin' };
    }
    throw new Error('Invalid token');
  }),
}));

// Mock leaderboard module
vi.mock('../../db/leaderboard.js', () => ({
  getLeaderboard: vi.fn(),
  getPlayerStats: vi.fn(),
  getTournamentHistory: vi.fn(),
}));

function createMockReq(method: string, url: string, headers: Record<string, string> = {}): IncomingMessage {
  const req = new EventEmitter() as IncomingMessage;
  req.method = method;
  req.url = url;
  req.headers = headers;
  return req;
}

function createMockRes(): ServerResponse & { _status: number; _body: string; _headers: Record<string, string> } {
  const res = new EventEmitter() as any;
  res._status = 0;
  res._body = '';
  res._headers = {};
  res.setHeader = (key: string, value: string) => { res._headers[key.toLowerCase()] = value; };
  res.writeHead = (status: number, headers?: Record<string, string>) => {
    res._status = status;
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        res._headers[k.toLowerCase()] = v;
      }
    }
  };
  res.end = (body?: string) => { res._body = body || ''; };
  return res;
}

function parseBody(res: ReturnType<typeof createMockRes>): any {
  return JSON.parse(res._body);
}

describe('GET /api/admin/rooms', () => {
  let rooms: RoomManager;
  let connections: ConnectionManager;

  beforeEach(() => {
    rooms = new RoomManager();
    connections = new ConnectionManager();
  });

  it('returns 403 without admin token', async () => {
    const req = createMockReq('GET', '/api/admin/rooms');
    const res = createMockRes();

    const handled = await handleApiRoute(req, res, rooms, connections);

    expect(handled).toBe(true);
    expect(res._status).toBe(403);
    expect(parseBody(res).error).toBe('Admin access required');
  });

  it('returns empty array when no rooms', async () => {
    const req = createMockReq('GET', '/api/admin/rooms', {
      authorization: 'Bearer valid-admin-token',
    });
    const res = createMockRes();

    const handled = await handleApiRoute(req, res, rooms, connections);

    expect(handled).toBe(true);
    expect(res._status).toBe(200);
    expect(parseBody(res)).toEqual([]);
  });

  it('returns active rooms with player connection status', async () => {
    const room = rooms.createRoom('host1', 'Alice', 'standard');
    rooms.joinRoom(room.code, 'player2', 'Bob');

    // Simulate host1 being connected via a mock ws
    const mockWs = { readyState: 1, close: vi.fn(), send: vi.fn() } as any;
    connections.add(mockWs, 'host1', 'Alice');

    const req = createMockReq('GET', '/api/admin/rooms', {
      authorization: 'Bearer valid-admin-token',
    });
    const res = createMockRes();

    const handled = await handleApiRoute(req, res, rooms, connections);

    expect(handled).toBe(true);
    expect(res._status).toBe(200);

    const body = parseBody(res);
    expect(body).toHaveLength(1);
    expect(body[0].code).toBe(room.code);
    expect(body[0].hostId).toBe('host1');
    expect(body[0].mode).toBe('standard');
    expect(body[0].phase).toBe('lobby');
    expect(body[0].createdAt).toBeTypeOf('number');
    expect(body[0].lastActivityAt).toBeTypeOf('number');

    // Check players with connection status
    expect(body[0].players).toHaveLength(2);
    const alice = body[0].players.find((p: any) => p.id === 'host1');
    const bob = body[0].players.find((p: any) => p.id === 'player2');
    expect(alice.name).toBe('Alice');
    expect(alice.connected).toBe(true);
    expect(bob.name).toBe('Bob');
    expect(bob.connected).toBe(false);
  });

  it('shows phase as "playing" when game has started', async () => {
    const room = rooms.createRoom('host1', 'Alice', 'standard');
    rooms.joinRoom(room.code, 'p2', 'Bob');
    rooms.joinRoom(room.code, 'p3', 'Charlie');
    rooms.startGame(room.code, 5);

    const req = createMockReq('GET', '/api/admin/rooms', {
      authorization: 'Bearer valid-admin-token',
    });
    const res = createMockRes();

    await handleApiRoute(req, res, rooms, connections);

    const body = parseBody(res);
    expect(body[0].phase).toBe('playing');
  });
});

describe('DELETE /api/admin/rooms/:code', () => {
  let rooms: RoomManager;
  let connections: ConnectionManager;

  beforeEach(() => {
    rooms = new RoomManager();
    connections = new ConnectionManager();
  });

  it('returns 403 without admin token', async () => {
    const req = createMockReq('DELETE', '/api/admin/rooms/ABCD');
    const res = createMockRes();

    const handled = await handleApiRoute(req, res, rooms, connections);

    expect(handled).toBe(true);
    expect(res._status).toBe(403);
  });

  it('returns 404 for non-existent room', async () => {
    const req = createMockReq('DELETE', '/api/admin/rooms/ZZZZ', {
      authorization: 'Bearer valid-admin-token',
    });
    const res = createMockRes();

    const handled = await handleApiRoute(req, res, rooms, connections);

    expect(handled).toBe(true);
    expect(res._status).toBe(404);
    expect(parseBody(res).error).toBe('Room not found');
  });

  it('removes the room and notifies connected players', async () => {
    const room = rooms.createRoom('host1', 'Alice', 'standard');
    rooms.joinRoom(room.code, 'p2', 'Bob');

    // Connect both players
    const ws1 = { readyState: 1, close: vi.fn(), send: vi.fn() } as any;
    const ws2 = { readyState: 1, close: vi.fn(), send: vi.fn() } as any;
    connections.add(ws1, 'host1', 'Alice');
    connections.add(ws2, 'p2', 'Bob');

    const req = createMockReq('DELETE', `/api/admin/rooms/${room.code}`, {
      authorization: 'Bearer valid-admin-token',
    });
    const res = createMockRes();

    const handled = await handleApiRoute(req, res, rooms, connections);

    expect(handled).toBe(true);
    expect(res._status).toBe(200);
    expect(parseBody(res).ok).toBe(true);

    // Room should be gone
    expect(rooms.getRoom(room.code)).toBeUndefined();

    // Both players should have received a notification
    expect(ws1.send).toHaveBeenCalledOnce();
    expect(ws2.send).toHaveBeenCalledOnce();

    const msg1 = JSON.parse(ws1.send.mock.calls[0][0]);
    expect(msg1.type).toBe('ROOM_CLOSED');
    expect(msg1.reason).toContain('admin');
  });

  it('removes the room even when no players are connected', async () => {
    const room = rooms.createRoom('host1', 'Alice', 'standard');
    const sendSpy = vi.spyOn(connections, 'send');

    const req = createMockReq('DELETE', `/api/admin/rooms/${room.code}`, {
      authorization: 'Bearer valid-admin-token',
    });
    const res = createMockRes();

    await handleApiRoute(req, res, rooms, connections);

    expect(res._status).toBe(200);
    expect(rooms.getRoom(room.code)).toBeUndefined();
    // send is called for the player, but no ws is connected so it's a no-op
    expect(sendSpy).toHaveBeenCalledWith('host1', expect.objectContaining({ type: 'ROOM_CLOSED' }));
  });
});

describe('OPTIONS /api/admin/rooms', () => {
  it('handles CORS preflight for admin rooms endpoints', async () => {
    const req = createMockReq('OPTIONS', '/api/admin/rooms/ABCD');
    const res = createMockRes();

    const handled = await handleApiRoute(req, res, new RoomManager(), new ConnectionManager());

    expect(handled).toBe(true);
    expect(res._status).toBe(204);
  });
});
