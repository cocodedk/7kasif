import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WebSocket } from 'ws';
import { MessageHandler } from '../../rooms/MessageHandler.js';
import { RoomManager } from '../../rooms/RoomManager.js';
import { ConnectionManager } from '../../rooms/ConnectionManager.js';
import { BotManager } from '../../rooms/BotManager.js';

// Mock auth module
vi.mock('../../auth/auth.js', () => ({
  verifyToken: vi.fn((token: string) => {
    if (token === 'token-1') return { userId: 1, email: 'a@test.com', role: 'user' };
    if (token === 'token-2') return { userId: 2, email: 'b@test.com', role: 'user' };
    if (token === 'token-3') return { userId: 3, email: 'c@test.com', role: 'user' };
    throw new Error('Invalid token');
  }),
}));

// Mock game-logger to avoid file system writes
vi.mock('../../logging/game-logger.js', () => ({
  GameLogger: vi.fn().mockImplementation(() => ({
    logInit: vi.fn(),
    logAction: vi.fn(),
    logGameOver: vi.fn(),
  })),
}));

// Mock DB tournament functions
const mockSaveTournament = vi.fn().mockResolvedValue(42);
const mockSaveSessionPlayers = vi.fn().mockResolvedValue(undefined);
const mockSaveRound = vi.fn().mockResolvedValue(1);
const mockSaveScores = vi.fn().mockResolvedValue(undefined);
const mockSaveScoreSnapshots = vi.fn().mockResolvedValue(undefined);
const mockEndTournament = vi.fn().mockResolvedValue(undefined);

vi.mock('../../db/tournaments.js', () => ({
  saveTournament: (...args: any[]) => mockSaveTournament(...args),
  saveSessionPlayers: (...args: any[]) => mockSaveSessionPlayers(...args),
  saveRound: (...args: any[]) => mockSaveRound(...args),
  saveScores: (...args: any[]) => mockSaveScores(...args),
  saveScoreSnapshots: (...args: any[]) => mockSaveScoreSnapshots(...args),
  endTournament: (...args: any[]) => mockEndTournament(...args),
}));

function createMockWs(): WebSocket {
  return {
    readyState: 1,
    send: vi.fn(),
    close: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  } as any;
}

function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('Game persistence', () => {
  let handler: MessageHandler;
  let connections: ConnectionManager;
  let rooms: RoomManager;
  let botManager: BotManager;
  let ws1: WebSocket, ws2: WebSocket, ws3: WebSocket;

  beforeEach(() => {
    vi.clearAllMocks();
    connections = new ConnectionManager();
    rooms = new RoomManager();
    botManager = new BotManager();
    handler = new MessageHandler(connections, rooms, botManager);

    ws1 = createMockWs();
    ws2 = createMockWs();
    ws3 = createMockWs();
  });

  function createAndJoinRoom(): string {
    handler.handleMessage(ws1, JSON.stringify({
      type: 'CREATE_ROOM',
      playerName: 'Alice',
      mode: 'standard',
      token: 'token-1',
    }));

    // Extract room code from the ROOM_CREATED message sent to ws1
    const createMsg = JSON.parse((ws1.send as any).mock.calls[0][0]);
    const roomCode = createMsg.roomCode;

    handler.handleMessage(ws2, JSON.stringify({
      type: 'JOIN_ROOM',
      roomCode,
      playerName: 'Bob',
      token: 'token-2',
    }));

    handler.handleMessage(ws3, JSON.stringify({
      type: 'JOIN_ROOM',
      roomCode,
      playerName: 'Charlie',
      token: 'token-3',
    }));

    return roomCode;
  }

  describe('on first handleStartGame', () => {
    it('calls saveTournament and saveSessionPlayers', async () => {
      const roomCode = createAndJoinRoom();

      handler.handleMessage(ws1, JSON.stringify({
        type: 'START_GAME',
        cardsPerPlayer: 5,
      }));

      await flushPromises();

      expect(mockSaveTournament).toHaveBeenCalledOnce();
      expect(mockSaveTournament).toHaveBeenCalledWith(
        expect.any(String), // session code
        roomCode,
        'standard',
      );

      expect(mockSaveSessionPlayers).toHaveBeenCalledOnce();
      expect(mockSaveSessionPlayers).toHaveBeenCalledWith(
        42, // returned DB session ID
        expect.arrayContaining([
          { userId: 1, playerName: 'Alice' },
          { userId: 2, playerName: 'Bob' },
          { userId: 3, playerName: 'Charlie' },
        ]),
      );
    });

    it('sets dbSessionId on the room', async () => {
      const roomCode = createAndJoinRoom();

      handler.handleMessage(ws1, JSON.stringify({
        type: 'START_GAME',
        cardsPerPlayer: 5,
      }));

      await flushPromises();

      const room = rooms.getRoom(roomCode);
      expect(room?.dbSessionId).toBe(42);
    });

    it('does not call saveTournament on subsequent rounds', async () => {
      const roomCode = createAndJoinRoom();

      handler.handleMessage(ws1, JSON.stringify({
        type: 'START_GAME',
        cardsPerPlayer: 5,
      }));

      await flushPromises();
      expect(mockSaveTournament).toHaveBeenCalledOnce();

      // Simulate game ending and next round starting
      // Manually set the room state as if game ended
      const room = rooms.getRoom(roomCode)!;
      room.gameState = null;

      vi.clearAllMocks();

      handler.handleMessage(ws1, JSON.stringify({
        type: 'NEXT_ROUND',
        cardsPerPlayer: 5,
      }));

      await flushPromises();

      // Should NOT call saveTournament again since dbSessionId is already set
      expect(mockSaveTournament).not.toHaveBeenCalled();
    });
  });

  describe('saveScoreSnapshots mock is wired', () => {
    it('saveScoreSnapshots is available as a mock', () => {
      // Verify the mock is registered so persistRoundAndScores can call it
      expect(mockSaveScoreSnapshots).toBeDefined();
      expect(mockSaveScoreSnapshots).not.toHaveBeenCalled();
    });
  });

  describe('DB errors do not break gameplay', () => {
    it('game starts even if saveTournament fails', async () => {
      mockSaveTournament.mockRejectedValueOnce(new Error('DB connection failed'));

      const roomCode = createAndJoinRoom();

      handler.handleMessage(ws1, JSON.stringify({
        type: 'START_GAME',
        cardsPerPlayer: 5,
      }));

      await flushPromises();

      // Game should still be running - players should have received GAME_STATE
      const room = rooms.getRoom(roomCode);
      expect(room?.gameState).not.toBeNull();

      // Check that GAME_STATE was sent
      const sentMessages = (ws1.send as any).mock.calls.map(
        (c: any[]) => JSON.parse(c[0]).type,
      );
      expect(sentMessages).toContain('GAME_STATE');
    });

    it('game continues even if saveRound fails', async () => {
      const roomCode = createAndJoinRoom();

      handler.handleMessage(ws1, JSON.stringify({
        type: 'START_GAME',
        cardsPerPlayer: 5,
      }));

      await flushPromises();

      const room = rooms.getRoom(roomCode)!;
      expect(room.dbSessionId).toBe(42);

      // Pre-configure saveRound to fail, then directly invoke persistRoundAndScores
      mockSaveRound.mockRejectedValueOnce(new Error('DB timeout'));
      await (handler as any).persistRoundAndScores(room, 'user_1', 'user_2', 3, false, '7');
      await flushPromises();

      // saveRound was called and failed, but no error propagated
      expect(mockSaveRound).toHaveBeenCalledWith(
        42,
        expect.any(Number),
        expect.any(Number),
        expect.any(String),
        expect.any(String),
        3,
        false,
        '7',
      );

      // Game state remains active — the DB error didn't crash anything
      expect(room.gameState).not.toBeNull();
    });

    it('session ends even if saveScores fails', async () => {
      mockSaveScores.mockRejectedValueOnce(new Error('DB write failed'));

      const roomCode = createAndJoinRoom();

      handler.handleMessage(ws1, JSON.stringify({
        type: 'START_GAME',
        cardsPerPlayer: 5,
      }));

      await flushPromises();

      // End session - should not throw
      handler.handleMessage(ws1, JSON.stringify({
        type: 'END_SESSION',
      }));

      await flushPromises();

      // SESSION_ENDED should have been sent despite DB error
      const sentMessages = (ws1.send as any).mock.calls.map(
        (c: any[]) => JSON.parse(c[0]).type,
      );
      expect(sentMessages).toContain('SESSION_ENDED');
    });
  });

  describe('on handleEndSession', () => {
    it('calls saveScores and endTournament', async () => {
      const roomCode = createAndJoinRoom();

      handler.handleMessage(ws1, JSON.stringify({
        type: 'START_GAME',
        cardsPerPlayer: 5,
      }));

      await flushPromises();

      handler.handleMessage(ws1, JSON.stringify({
        type: 'END_SESSION',
      }));

      await flushPromises();

      expect(mockSaveScores).toHaveBeenCalledOnce();
      expect(mockSaveScores).toHaveBeenCalledWith(
        42,
        expect.any(Array),
        expect.any(Map),
      );

      expect(mockEndTournament).toHaveBeenCalledOnce();
      expect(mockEndTournament).toHaveBeenCalledWith(42);
    });

    it('does not call DB functions when dbSessionId is null', async () => {
      const roomCode = createAndJoinRoom();

      // Start game but make DB fail so dbSessionId stays null
      mockSaveTournament.mockRejectedValueOnce(new Error('DB down'));

      handler.handleMessage(ws1, JSON.stringify({
        type: 'START_GAME',
        cardsPerPlayer: 5,
      }));

      await flushPromises();

      const room = rooms.getRoom(roomCode);
      expect(room?.dbSessionId).toBeNull();

      vi.clearAllMocks();

      handler.handleMessage(ws1, JSON.stringify({
        type: 'END_SESSION',
      }));

      await flushPromises();

      expect(mockSaveScores).not.toHaveBeenCalled();
      expect(mockEndTournament).not.toHaveBeenCalled();
    });
  });
});
