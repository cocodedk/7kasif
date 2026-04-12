import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { vi } from 'vitest';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer, type Server } from 'http';

let mockUserCounter = 0;
vi.mock('../auth/auth.js', () => ({
  verifyToken: (token: string) => {
    if (!token.startsWith('test-token-')) throw new Error('Invalid token');
    const id = parseInt(token.replace('test-token-', ''), 10);
    return { userId: id, email: `user${id}@test.com`, role: 'player' };
  },
}));

import { ConnectionManager } from '../rooms/ConnectionManager.js';
import { RoomManager } from '../rooms/RoomManager.js';
import { BotManager } from '../rooms/BotManager.js';
import { MessageHandler } from '../rooms/MessageHandler.js';
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
    handler = new MessageHandler(connections, rooms, new BotManager({ actionDelayMs: 0 }));

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

    ws.on('message', (data) => {
      messages.push(JSON.parse(data.toString()));
    });

    ws.on('open', () => resolve({ ws, messages }));
    ws.on('error', reject);
  });
}

function sendMsg(ws: WebSocket, msg: ClientMessage): void {
  ws.send(JSON.stringify(msg));
}

function nextToken(): string {
  return `test-token-${++mockUserCounter}`;
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
        if (messages[i].type === type) {
          return resolve(messages[i]);
        }
      }
      if (Date.now() - start > timeoutMs) {
        return reject(new Error(`Timeout waiting for ${type}. Got: ${messages.map(m => m.type).join(', ')}`));
      }
      setTimeout(check, 10);
    };
    check();
  });
}

describe('Server Integration', () => {
  beforeAll(async () => {
    port = await createTestServer();
  });

  afterAll(() => {
    wss.close();
    httpServer.close();
  });

  it('should create a room and receive room code', async () => {
    const { ws, messages } = await createClient(port);

    sendMsg(ws, { type: 'CREATE_ROOM', playerName: 'Alice', mode: 'standard', token: nextToken() });
    const msg = await waitForMessage(messages, 'ROOM_CREATED');

    expect(msg.type).toBe('ROOM_CREATED');
    if (msg.type === 'ROOM_CREATED') {
      expect(msg.roomCode).toHaveLength(4);
      expect(msg.playerId).toBeTruthy();
    }

    ws.close();
  });

  it('should allow joining an existing room', async () => {
    const host = await createClient(port);
    sendMsg(host.ws, { type: 'CREATE_ROOM', playerName: 'Alice', mode: 'standard', token: nextToken() });
    const created = await waitForMessage(host.messages, 'ROOM_CREATED') as any;

    const joiner = await createClient(port);
    sendMsg(joiner.ws, { type: 'JOIN_ROOM', roomCode: created.roomCode, playerName: 'Bob', token: nextToken() });
    const joined = await waitForMessage(joiner.messages, 'ROOM_JOINED');

    expect(joined.type).toBe('ROOM_JOINED');
    if (joined.type === 'ROOM_JOINED') {
      expect(joined.players).toHaveLength(2);
    }

    host.ws.close();
    joiner.ws.close();
  });

  it('should reject joining a nonexistent room', async () => {
    const { ws, messages } = await createClient(port);

    sendMsg(ws, { type: 'JOIN_ROOM', roomCode: 'ZZZZ', playerName: 'Bob', token: nextToken() });
    const msg = await waitForMessage(messages, 'MOVE_REJECTED');

    expect(msg.type).toBe('MOVE_REJECTED');
    ws.close();
  });

  it('should play a full game with 3 players', async () => {
    // Create room
    const host = await createClient(port);
    sendMsg(host.ws, { type: 'CREATE_ROOM', playerName: 'Alice', mode: 'standard', token: nextToken() });
    const created = await waitForMessage(host.messages, 'ROOM_CREATED') as any;
    const roomCode = created.roomCode;

    // Join 2 more players
    const p2 = await createClient(port);
    sendMsg(p2.ws, { type: 'JOIN_ROOM', roomCode, playerName: 'Bob', token: nextToken() });
    await waitForMessage(p2.messages, 'ROOM_JOINED');

    const p3 = await createClient(port);
    sendMsg(p3.ws, { type: 'JOIN_ROOM', roomCode, playerName: 'Charlie', token: nextToken() });
    await waitForMessage(p3.messages, 'ROOM_JOINED');

    // Start game
    sendMsg(host.ws, { type: 'START_GAME', cardsPerPlayer: 2 });

    // Wait for all players to receive game state
    const hostState = await waitForMessage(host.messages, 'GAME_STATE') as any;
    const p2State = await waitForMessage(p2.messages, 'GAME_STATE') as any;
    const p3State = await waitForMessage(p3.messages, 'GAME_STATE') as any;

    expect(hostState.state.myHand.length).toBeGreaterThanOrEqual(2);
    expect(p2State.state.myHand.length).toBeGreaterThanOrEqual(2);
    expect(p3State.state.myHand.length).toBeGreaterThanOrEqual(2);

    // Verify opponent card counts are hidden
    expect(hostState.state.opponents[0].cardCount).toBeGreaterThanOrEqual(2);
    // Opponent hands should not contain actual cards (only count)
    expect(hostState.state.opponents[0]).not.toHaveProperty('hand');

    // Identify current player
    const allClients = [
      { ...host, playerId: created.playerId, state: hostState.state },
      { ...p2, playerId: (await waitForMessage(p2.messages, 'ROOM_JOINED', 0) as any).playerId, state: p2State.state },
      { ...p3, playerId: (await waitForMessage(p3.messages, 'ROOM_JOINED', 0) as any).playerId, state: p3State.state },
    ];

    // Play a turn: handle any pending effect from the initial card, then draw
    const currentPlayerId = hostState.state.currentPlayerId;
    const currentClient = allClients.find(c => c.playerId === currentPlayerId);
    if (currentClient) {
      const pending = currentClient.state.pendingEffect;

      if (pending?.type === 'jack-declare') {
        // DECLARE_SUIT advances the turn — do not attempt DRAW_CARD afterwards
        const msgCountBefore = currentClient.messages.length;
        sendMsg(currentClient.ws, {
          type: 'PLAYER_ACTION',
          action: { type: 'DECLARE_SUIT', suit: 'hearts' },
        });
        const afterDeclare = await waitForMessage(currentClient.messages, 'GAME_STATE', msgCountBefore);
        expect(afterDeclare.type).toBe('GAME_STATE');
      } else {
        // Resolve queen-reveal if present (turn stays with current player)
        if (pending?.type === 'queen-reveal') {
          const msgCountBefore = currentClient.messages.length;
          sendMsg(currentClient.ws, {
            type: 'PLAYER_ACTION',
            action: { type: 'REVEAL_CARD', card: currentClient.state.myHand[0] },
          });
          const afterReveal = await waitForMessage(currentClient.messages, 'GAME_STATE', msgCountBefore);
          expect(afterReveal.type).toBe('GAME_STATE');
        }

        // Draw a card — valid for: no pending, queen-reveal (resolved above),
        // seven-chain, ace-chain, seven-penalty
        const msgCountBefore = currentClient.messages.length;
        sendMsg(currentClient.ws, {
          type: 'PLAYER_ACTION',
          action: { type: 'DRAW_CARD' },
        });
        const updated = await waitForMessage(currentClient.messages, 'GAME_STATE', msgCountBefore);
        expect(updated.type).toBe('GAME_STATE');
      }
    }

    host.ws.close();
    p2.ws.close();
    p3.ws.close();
  });

  it('should reject non-host starting the game', async () => {
    const host = await createClient(port);
    sendMsg(host.ws, { type: 'CREATE_ROOM', playerName: 'Alice', mode: 'standard', token: nextToken() });
    const created = await waitForMessage(host.messages, 'ROOM_CREATED') as any;

    const p2 = await createClient(port);
    sendMsg(p2.ws, { type: 'JOIN_ROOM', roomCode: created.roomCode, playerName: 'Bob', token: nextToken() });
    await waitForMessage(p2.messages, 'ROOM_JOINED');

    const p3 = await createClient(port);
    sendMsg(p3.ws, { type: 'JOIN_ROOM', roomCode: created.roomCode, playerName: 'Charlie', token: nextToken() });
    await waitForMessage(p3.messages, 'ROOM_JOINED');

    // Non-host tries to start
    sendMsg(p2.ws, { type: 'START_GAME', cardsPerPlayer: 7 });
    const rejected = await waitForMessage(p2.messages, 'MOVE_REJECTED');
    expect(rejected.type).toBe('MOVE_REJECTED');

    host.ws.close();
    p2.ws.close();
    p3.ws.close();
  });

  it('should reject starting with fewer than 3 players', async () => {
    const host = await createClient(port);
    sendMsg(host.ws, { type: 'CREATE_ROOM', playerName: 'Alice', mode: 'standard', token: nextToken() });
    await waitForMessage(host.messages, 'ROOM_CREATED');

    const p2 = await createClient(port);
    sendMsg(p2.ws, { type: 'JOIN_ROOM', roomCode: (host.messages[0] as any).roomCode, playerName: 'Bob', token: nextToken() });
    await waitForMessage(p2.messages, 'ROOM_JOINED');

    // Only 2 players — try to start
    const msgCount = host.messages.length;
    sendMsg(host.ws, { type: 'START_GAME', cardsPerPlayer: 7 });
    const rejected = await waitForMessage(host.messages, 'MOVE_REJECTED', msgCount);
    expect(rejected.type).toBe('MOVE_REJECTED');

    host.ws.close();
    p2.ws.close();
  });

  it('should send GAME_STATE to a player who reconnects mid-game', async () => {
    const hostToken = nextToken();
    const p2Token = nextToken();
    const p3Token = nextToken();

    const host = await createClient(port);
    sendMsg(host.ws, { type: 'CREATE_ROOM', playerName: 'Alice', mode: 'standard', token: hostToken });
    const created = await waitForMessage(host.messages, 'ROOM_CREATED') as any;
    const roomCode = created.roomCode;

    const p2 = await createClient(port);
    sendMsg(p2.ws, { type: 'JOIN_ROOM', roomCode, playerName: 'Bob', token: p2Token });
    await waitForMessage(p2.messages, 'ROOM_JOINED');

    const p3 = await createClient(port);
    sendMsg(p3.ws, { type: 'JOIN_ROOM', roomCode, playerName: 'Charlie', token: p3Token });
    await waitForMessage(p3.messages, 'ROOM_JOINED');

    // Start the game
    sendMsg(host.ws, { type: 'START_GAME', cardsPerPlayer: 2 });
    await waitForMessage(host.messages, 'GAME_STATE');
    await waitForMessage(p2.messages, 'GAME_STATE');
    await waitForMessage(p3.messages, 'GAME_STATE');

    // p2 disconnects
    p2.ws.close();
    await new Promise(resolve => setTimeout(resolve, 50));

    // p2 reconnects with the same token (same player ID) — should receive GAME_STATE
    const p2Reconnect = await createClient(port);
    const msgCountBefore = p2Reconnect.messages.length;
    sendMsg(p2Reconnect.ws, { type: 'JOIN_ROOM', roomCode, playerName: 'Bob', token: p2Token });

    await waitForMessage(p2Reconnect.messages, 'ROOM_JOINED', msgCountBefore);
    const gameState = await waitForMessage(p2Reconnect.messages, 'GAME_STATE', msgCountBefore);
    expect(gameState.type).toBe('GAME_STATE');

    host.ws.close();
    p3.ws.close();
    p2Reconnect.ws.close();
  });
});

describe('Add Bots', () => {
  beforeAll(async () => {
    port = await createTestServer();
  });

  afterAll(() => {
    wss.close();
    httpServer.close();
  });

  it('should add bots and include them in player list', async () => {
    const host = await createClient(port);
    sendMsg(host.ws, { type: 'CREATE_ROOM', playerName: 'Alice', mode: 'standard', token: nextToken() });
    const created = await waitForMessage(host.messages, 'ROOM_CREATED') as any;

    // Host should receive ROOM_JOINED with themselves
    const initialJoin = await waitForMessage(host.messages, 'ROOM_JOINED') as any;
    expect(initialJoin.players).toHaveLength(1);

    // Add 2 bots
    const msgCount = host.messages.length;
    sendMsg(host.ws, { type: 'ADD_BOTS', count: 2 });
    const updated = await waitForMessage(host.messages, 'ROOM_JOINED', msgCount) as any;

    expect(updated.players).toHaveLength(3);
    expect(updated.players[1].id).toMatch(/^bot_/);
    expect(updated.players[2].id).toMatch(/^bot_/);

    host.ws.close();
  });

  it('should reject adding bots when room would exceed 4 players', async () => {
    const host = await createClient(port);
    sendMsg(host.ws, { type: 'CREATE_ROOM', playerName: 'Alice', mode: 'standard', token: nextToken() });
    const created = await waitForMessage(host.messages, 'ROOM_CREATED') as any;

    // Add 3 bots (total 4)
    let msgCount = host.messages.length;
    sendMsg(host.ws, { type: 'ADD_BOTS', count: 3 });
    await waitForMessage(host.messages, 'ROOM_JOINED', msgCount);

    // Try adding another bot (would be 5)
    msgCount = host.messages.length;
    sendMsg(host.ws, { type: 'ADD_BOTS', count: 1 });
    const rejected = await waitForMessage(host.messages, 'MOVE_REJECTED', msgCount);
    expect(rejected.type).toBe('MOVE_REJECTED');

    host.ws.close();
  });

  it('should reject non-host adding bots', async () => {
    const host = await createClient(port);
    sendMsg(host.ws, { type: 'CREATE_ROOM', playerName: 'Alice', mode: 'standard', token: nextToken() });
    const created = await waitForMessage(host.messages, 'ROOM_CREATED') as any;

    const p2 = await createClient(port);
    sendMsg(p2.ws, { type: 'JOIN_ROOM', roomCode: created.roomCode, playerName: 'Bob', token: nextToken() });
    await waitForMessage(p2.messages, 'ROOM_JOINED');

    const msgCount = p2.messages.length;
    sendMsg(p2.ws, { type: 'ADD_BOTS', count: 1 });
    const rejected = await waitForMessage(p2.messages, 'MOVE_REJECTED', msgCount);
    expect(rejected.type).toBe('MOVE_REJECTED');

    host.ws.close();
    p2.ws.close();
  });

});

describe('RoomManager unit tests', () => {
  it('should generate unique 4-char room codes', () => {
    const rm = new RoomManager();
    const codes = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const room = rm.createRoom(`host${i}`, `Host${i}`, 'standard');
      expect(room.code).toHaveLength(4);
      expect(codes.has(room.code)).toBe(false);
      codes.add(room.code);
    }
  });

  it('should not allow more than 4 players', () => {
    const rm = new RoomManager();
    const room = rm.createRoom('h', 'Host', 'standard');
    rm.joinRoom(room.code, 'p2', 'P2');
    rm.joinRoom(room.code, 'p3', 'P3');
    rm.joinRoom(room.code, 'p4', 'P4');
    const result = rm.joinRoom(room.code, 'p5', 'P5');
    expect(result).toBeNull();
  });

  it('should not allow joining after game starts', () => {
    const rm = new RoomManager();
    const room = rm.createRoom('h', 'Host', 'standard');
    rm.joinRoom(room.code, 'p2', 'P2');
    rm.joinRoom(room.code, 'p3', 'P3');
    rm.startGame(room.code, 7);
    const result = rm.joinRoom(room.code, 'p4', 'P4');
    expect(result).toBeNull();
  });

  it('should produce filtered player views', () => {
    const rm = new RoomManager();
    const room = rm.createRoom('h', 'Host', 'standard');
    rm.joinRoom(room.code, 'p2', 'P2');
    rm.joinRoom(room.code, 'p3', 'P3');
    const result = rm.startGame(room.code, 3);
    expect(result).not.toBeNull();

    if (result) {
      const view = rm.getPlayerView(result.state, 'h');
      expect(view.myHand.length).toBeGreaterThan(0);
      expect(view.opponents).toHaveLength(2);
      // Opponents should not leak hand cards
      for (const opp of view.opponents) {
        expect(opp.cardCount).toBeGreaterThan(0);
        expect(opp).not.toHaveProperty('hand');
      }
    }
  });
});

describe('ConnectionManager unit tests', () => {
  it('should track connections', () => {
    const cm = new ConnectionManager();
    const fakeWs = { readyState: 1, close: () => {}, send: () => {} } as any;

    cm.add(fakeWs, 'p1', 'Alice');
    expect(cm.isConnected('p1')).toBe(true);
    expect(cm.getPlayerIdByWs(fakeWs)).toBe('p1');
  });

  it('should handle disconnection and grace period', () => {
    const cm = new ConnectionManager();
    const fakeWs = { readyState: 1, close: () => {}, send: () => {} } as any;

    cm.add(fakeWs, 'p1', 'Alice');
    cm.remove(fakeWs);
    expect(cm.isConnected('p1')).toBe(false);
    expect(cm.isWithinGracePeriod('p1')).toBe(true);
  });

  it('should allow reconnection within grace period', () => {
    const cm = new ConnectionManager();
    const ws1 = { readyState: 1, close: () => {}, send: () => {} } as any;
    const ws2 = { readyState: 1, close: () => {}, send: () => {} } as any;

    cm.add(ws1, 'p1', 'Alice');
    cm.remove(ws1);
    const reconnected = cm.reconnect(ws2, 'p1');
    expect(reconnected).toBe(true);
    expect(cm.isConnected('p1')).toBe(true);
    expect(cm.getPlayerIdByWs(ws2)).toBe('p1');
  });
});
