import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { vi } from 'vitest';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer, type Server } from 'http';
import { getTestPool, initTestDb, cleanTestDb, closeTestDb } from './test-db.js';

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

import { ConnectionManager } from '../../rooms/ConnectionManager.js';
import { RoomManager } from '../../rooms/RoomManager.js';
import { MessageHandler } from '../../rooms/MessageHandler.js';
import { createUser, sendMagicLink, verifyMagicToken } from '../../auth/auth.js';
import type { ServerMessage, ClientMessage } from '@hafte-kasif/shared';

let httpServer: Server;
let wss: WebSocketServer;
let connections: ConnectionManager;
let rooms: RoomManager;
let handler: MessageHandler;
let port: number;

function createTestServer(): Promise<number> {
  return new Promise((resolve) => {
    connections = new ConnectionManager();
    rooms = new RoomManager();
    handler = new MessageHandler(connections, rooms);

    httpServer = createServer();
    wss = new WebSocketServer({ server: httpServer, path: '/ws' });

    wss.on('connection', (ws) => {
      ws.on('message', (data) => {
        handler.handleMessage(ws, data.toString());
      });
      ws.on('close', () => {
        connections.remove(ws);
      });
    });

    httpServer.listen(0, () => {
      const addr = httpServer.address();
      resolve(typeof addr === 'object' ? addr!.port : 0);
    });
  });
}

function createClient(p: number): Promise<{ ws: WebSocket; messages: ServerMessage[] }> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${p}/ws`);
    const messages: ServerMessage[] = [];
    ws.on('message', (data) => messages.push(JSON.parse(data.toString())));
    ws.on('open', () => resolve({ ws, messages }));
    ws.on('error', reject);
  });
}

function sendMsg(ws: WebSocket, msg: ClientMessage): void {
  ws.send(JSON.stringify(msg));
}

function waitForMessage(
  messages: ServerMessage[],
  type: string,
  startIdx: number = 0,
  timeoutMs: number = 2000,
): Promise<ServerMessage> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      for (let i = startIdx; i < messages.length; i++) {
        if (messages[i].type === type) return resolve(messages[i]);
      }
      if (Date.now() - start > timeoutMs) {
        return reject(new Error(`Timeout waiting for ${type}`));
      }
      setTimeout(check, 10);
    };
    check();
  });
}

async function getJwtForUser(email: string, displayName: string): Promise<{ jwt: string; userId: number }> {
  const user = await createUser(email, displayName);
  await sendMagicLink(email);
  const pool = getTestPool();
  const tokenResult = await pool.query('SELECT token FROM magic_tokens WHERE user_id = $1', [user.id]);
  const result = await verifyMagicToken(tokenResult.rows[0].token);
  return { jwt: result.token, userId: user.id };
}

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-ws';
  process.env.APP_URL = 'http://localhost:3000';
  await initTestDb();
  port = await createTestServer();
});

beforeEach(async () => {
  await cleanTestDb();
});

afterAll(async () => {
  wss?.close();
  httpServer?.close();
  await closeTestDb();
});

describe('WebSocket auth integration', () => {
  it('should use user ID when valid token is provided', async () => {
    const { jwt, userId } = await getJwtForUser('alice@test.com', 'Alice');
    const { ws, messages } = await createClient(port);

    sendMsg(ws, { type: 'CREATE_ROOM', playerName: 'Alice', mode: 'standard', token: jwt });
    const msg = await waitForMessage(messages, 'ROOM_CREATED');

    expect(msg.type).toBe('ROOM_CREATED');
    if (msg.type === 'ROOM_CREATED') {
      expect(msg.playerId).toBe(`user_${userId}`);
    }

    ws.close();
  });

  it('should assign anonymous player ID without token', async () => {
    const { ws, messages } = await createClient(port);

    sendMsg(ws, { type: 'CREATE_ROOM', playerName: 'Guest', mode: 'standard' });
    const msg = await waitForMessage(messages, 'ROOM_CREATED');

    expect(msg.type).toBe('ROOM_CREATED');
    if (msg.type === 'ROOM_CREATED') {
      expect(msg.playerId).toMatch(/^player_/);
    }

    ws.close();
  });

  it('should assign anonymous player ID with invalid token', async () => {
    const { ws, messages } = await createClient(port);

    sendMsg(ws, { type: 'CREATE_ROOM', playerName: 'Guest', mode: 'standard', token: 'invalid.token' });
    const msg = await waitForMessage(messages, 'ROOM_CREATED');

    expect(msg.type).toBe('ROOM_CREATED');
    if (msg.type === 'ROOM_CREATED') {
      expect(msg.playerId).toMatch(/^player_/);
    }

    ws.close();
  });

  it('should allow authenticated user to join a room', async () => {
    // Host creates room
    const { ws: hostWs, messages: hostMsgs } = await createClient(port);
    sendMsg(hostWs, { type: 'CREATE_ROOM', playerName: 'Host', mode: 'standard' });
    const created = await waitForMessage(hostMsgs, 'ROOM_CREATED') as any;

    // Authenticated user joins
    const { jwt } = await getJwtForUser('bob@test.com', 'Bob');
    const { ws: joinWs, messages: joinMsgs } = await createClient(port);
    sendMsg(joinWs, { type: 'JOIN_ROOM', roomCode: created.roomCode, playerName: 'Bob', token: jwt });
    const joined = await waitForMessage(joinMsgs, 'ROOM_JOINED');

    expect(joined.type).toBe('ROOM_JOINED');
    if (joined.type === 'ROOM_JOINED') {
      expect(joined.playerId).toMatch(/^user_/);
    }

    hostWs.close();
    joinWs.close();
  });
});
