import type { WebSocket } from 'ws';
import type { ClientMessage, ServerMessage, Action, GameEvent, GameState, GameOverEvent } from '@hafte-kasif/shared';
import { FINISH_POINTS } from '@hafte-kasif/shared';
import { ConnectionManager } from './ConnectionManager.js';
import { RoomManager, type Room } from './RoomManager.js';
import { BotManager } from './BotManager.js';
import { applyAction } from '../engine/game.js';
import { filterEventsForPlayer } from '../engine/view.js';
import { verifyToken } from '../auth/auth.js';
import { GameLogger } from '../logging/game-logger.js';
import {
  saveTournament,
  saveSessionPlayers,
  saveRound,
  saveScores,
  saveScoreSnapshots,
  endTournament,
} from '../db/tournaments.js';

function extractUserId(playerId: string): number | null {
  return playerId.startsWith('user_') ? parseInt(playerId.slice(5), 10) : null;
}

export class MessageHandler {
  private loggers = new Map<string, GameLogger>();

  constructor(
    private connections: ConnectionManager,
    private rooms: RoomManager,
    private botManager: BotManager,
  ) {}

  handleMessage(ws: WebSocket, raw: string): void {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw);
    } catch {
      this.sendTo(ws, { type: 'MOVE_REJECTED', reason: 'Invalid JSON' });
      return;
    }

    const playerId = this.connections.getPlayerIdByWs(ws);
    if (process.env.DEBUG_GAME_LOG) console.log(`[MSG] type=${msg.type} playerId=${playerId || 'NONE'}`);

    switch (msg.type) {
      case 'CREATE_ROOM':
        this.handleCreateRoom(ws, msg.playerName, msg.mode, msg.token);
        break;
      case 'JOIN_ROOM':
        this.handleJoinRoom(ws, msg.roomCode, msg.playerName, msg.token);
        break;
      case 'START_GAME':
        if (playerId) this.handleStartGame(playerId, msg.cardsPerPlayer);
        break;
      case 'PLAYER_ACTION':
        if (playerId) this.handlePlayerAction(playerId, msg.action);
        break;
      case 'NEXT_ROUND':
        if (playerId) this.handleNextRound(playerId, msg.cardsPerPlayer);
        break;
      case 'END_SESSION':
        if (playerId) this.handleEndSession(playerId);
        break;
      case 'ADD_BOTS':
        if (playerId) this.handleAddBots(playerId, msg.count);
        break;
    }
  }

  private resolvePlayerId(token?: string): { playerId: string; userId: number } | null {
    if (process.env.DEBUG_GAME_LOG) {
      console.log(`[AUTH] resolvePlayerId token=${token ? 'PRESENT' : 'MISSING'}`);
    }
    if (token) {
      try {
        const decoded = verifyToken(token);
        if (process.env.DEBUG_GAME_LOG) console.log(`[AUTH] verified userId=${decoded.userId}`);
        return { playerId: `user_${decoded.userId}`, userId: decoded.userId };
      } catch (err: any) {
        console.error(`[AUTH] verifyToken failed:`, err.message);
      }
    }
    return null;
  }

  private validateHostAction(playerId: string, actionLabel: string): Room | null {
    const room = this.rooms.getRoomByPlayerId(playerId);
    if (!room) return null;
    if (room.hostId !== playerId) {
      this.connections.send(playerId, {
        type: 'MOVE_REJECTED',
        reason: `Only the host can ${actionLabel}`,
      });
      return null;
    }
    return room;
  }

  private broadcastDebugGameInit(room: Room, result: { deck: any[]; state: GameState }, cardsPerPlayer: number): void {
    // Server-side game logging
    const logger = new GameLogger(room.code);
    this.loggers.set(room.code, logger);
    logger.logInit(
      result.state,
      result.deck,
      room.players.map(p => ({ id: p.id, name: p.name })),
      room.mode,
      cardsPerPlayer,
      result.state.dealerId,
    );

    if (!process.env.DEBUG_GAME_LOG) return;
    for (const p of room.players) {
      this.connections.send(p.id, {
        type: 'DEBUG_GAME_INIT',
        deck: result.deck,
        dealerId: result.state.dealerId,
        cardsPerPlayer,
        mode: room.mode,
        players: room.players.map(pp => ({ id: pp.id, name: pp.name })),
      } satisfies ServerMessage);
    }
  }

  private processGameOver(room: Room, events: GameEvent[], newState: GameState): void {
    const gameOverEvent = events.find((e): e is GameOverEvent => e.type === 'GAME_OVER');
    if (!gameOverEvent) return;

    const logger = this.loggers.get(room.code);
    if (logger) {
      logger.logGameOver(gameOverEvent.winnerId, gameOverEvent.loserId, gameOverEvent.points, gameOverEvent.reversed, newState);
      this.loggers.delete(room.code);
    }

    const finishingCard = newState.finishingCard;
    const finishingValue = finishingCard ? String(finishingCard.value) : 'unknown';
    const isAceChainFull = gameOverEvent.points === FINISH_POINTS.ace_chain_full;

    this.rooms.recordRoundResult(
      room.code,
      gameOverEvent.winnerId,
      gameOverEvent.loserId,
      gameOverEvent.points,
      gameOverEvent.reversed,
      finishingValue,
      isAceChainFull,
    );

    // Persist round and updated scores to DB (after in-memory update so rounds.length is correct)
    this.persistRoundAndScores(
      room,
      gameOverEvent.winnerId,
      gameOverEvent.loserId,
      gameOverEvent.points,
      gameOverEvent.reversed,
      finishingValue,
    ).catch(() => {});

    for (const p of room.players) {
      this.connections.send(p.id, {
        type: 'GAME_OVER',
        winnerId: gameOverEvent.winnerId,
        loserId: gameOverEvent.loserId,
        points: gameOverEvent.points,
        reversed: gameOverEvent.reversed,
        hands: gameOverEvent.hands,
        finishingCard: finishingCard ?? null,
      } satisfies ServerMessage);
    }

    this.broadcastTournamentUpdate(room.code);
  }

  private handleCreateRoom(ws: WebSocket, playerName: string, mode: any, token?: string): void {
    const resolved = this.resolvePlayerId(token);
    if (!resolved) {
      this.sendTo(ws, { type: 'MOVE_REJECTED', reason: 'Authentication required' });
      return;
    }
    const { playerId } = resolved;
    this.connections.add(ws, playerId, playerName);

    const room = this.rooms.createRoom(playerId, playerName, mode);
    this.connections.setRoom(playerId, room.code);

    this.connections.send(playerId, {
      type: 'ROOM_CREATED',
      roomCode: room.code,
      playerId,
    } satisfies ServerMessage);

    // Send ROOM_JOINED so host appears in their own player list
    this.connections.send(playerId, {
      type: 'ROOM_JOINED',
      playerId,
      players: room.players.map(p => ({ id: p.id, name: p.name })),
    } satisfies ServerMessage);
  }

  private handleJoinRoom(ws: WebSocket, roomCode: string, playerName: string, token?: string): void {
    const resolved = this.resolvePlayerId(token);
    if (!resolved) {
      this.sendTo(ws, { type: 'MOVE_REJECTED', reason: 'Authentication required' });
      return;
    }
    const { playerId } = resolved;
    this.connections.add(ws, playerId, playerName);

    const room = this.rooms.joinRoom(roomCode, playerId, playerName);
    if (!room) {
      this.connections.send(playerId, {
        type: 'MOVE_REJECTED',
        reason: 'Room not found, full, or game already started',
      });
      return;
    }

    this.connections.setRoom(playerId, room.code);

    this.connections.send(playerId, {
      type: 'ROOM_JOINED',
      playerId,
      players: room.players.map(p => ({ id: p.id, name: p.name })),
    } satisfies ServerMessage);

    for (const p of room.players) {
      if (p.id !== playerId) {
        this.connections.send(p.id, {
          type: 'ROOM_JOINED',
          playerId: p.id,
          players: room.players.map(pp => ({ id: pp.id, name: pp.name })),
        } satisfies ServerMessage);
      }
    }
  }

  private handleStartGame(playerId: string, cardsPerPlayer: number): void {
    const room = this.validateHostAction(playerId, 'start the game');
    if (!room) return;

    const result = this.rooms.startGame(room.code, cardsPerPlayer);
    if (!result) {
      this.connections.send(playerId, {
        type: 'MOVE_REJECTED',
        reason: 'Cannot start game (need 3-4 players, valid card count)',
      });
      return;
    }

    // Persist tournament to DB on first round
    if (room.dbSessionId === null) {
      this.persistNewTournament(room).catch(() => {});
    }

    this.broadcastDebugGameInit(room, result, cardsPerPlayer);
    this.broadcastGameState(room.code);
    this.broadcastTournamentUpdate(room.code);
    this.triggerBotTurn(room.code);
  }

  private handlePlayerAction(playerId: string, action: Action): void {
    const room = this.rooms.getRoomByPlayerId(playerId);
    if (!room || !room.gameState) {
      this.connections.send(playerId, {
        type: 'MOVE_REJECTED',
        reason: 'No active game',
      });
      return;
    }

    const stateBefore = room.gameState;
    const result = applyAction(room.gameState, playerId, action);

    this.loggers.get(room.code)?.logAction(playerId, action, stateBefore, result);

    if (!result.ok) {
      this.connections.send(playerId, {
        type: 'MOVE_REJECTED',
        reason: result.reason,
      });
      return;
    }

    room.gameState = result.newState;
    room.lastActivityAt = Date.now();

    this.broadcastGameState(room.code, result.events, stateBefore);

    const hasGameOver = result.events.some(e => e.type === 'GAME_OVER');
    if (hasGameOver) {
      this.processGameOver(room, result.events, result.newState);
    } else {
      this.triggerBotTurn(room.code);
    }
  }

  private handleNextRound(playerId: string, cardsPerPlayer: number): void {
    const room = this.validateHostAction(playerId, 'start the next round');
    if (!room) return;

    const result = this.rooms.startGame(room.code, cardsPerPlayer);
    if (!result) {
      this.connections.send(playerId, {
        type: 'MOVE_REJECTED',
        reason: 'Cannot start next round',
      });
      return;
    }

    this.broadcastDebugGameInit(room, result, cardsPerPlayer);
    this.broadcastGameState(room.code);
    this.broadcastTournamentUpdate(room.code);
    this.botManager.resetRoomBotStates(room.code);
    this.triggerBotTurn(room.code);
  }

  private handleEndSession(playerId: string): void {
    const room = this.validateHostAction(playerId, 'end the session');
    if (!room) return;

    // Persist scores and end tournament in DB before ending in-memory session
    this.persistEndSession(room).catch(() => {});

    const tournament = this.rooms.endSession(room.code);
    if (tournament) {
      for (const p of room.players) {
        this.connections.send(p.id, {
          type: 'SESSION_ENDED',
          tournament,
        } satisfies ServerMessage);
      }
    }
  }

  private handleAddBots(playerId: string, count: number): void {
    const room = this.validateHostAction(playerId, 'add bots');
    if (!room) return;

    if (room.gameState) {
      this.connections.send(playerId, {
        type: 'MOVE_REJECTED',
        reason: 'Cannot add bots during a game',
      });
      return;
    }
    if (count < 1 || count > 3) {
      this.connections.send(playerId, {
        type: 'MOVE_REJECTED',
        reason: 'Bot count must be 1-3',
      });
      return;
    }
    if (room.players.length + count > 4) {
      this.connections.send(playerId, {
        type: 'MOVE_REJECTED',
        reason: 'Too many players (max 4)',
      });
      return;
    }

    this.botManager.addBots(room, count);

    // Broadcast updated player list to all human players
    for (const p of room.players) {
      this.connections.send(p.id, {
        type: 'ROOM_JOINED',
        playerId: p.id,
        players: room.players.map(pp => ({ id: pp.id, name: pp.name })),
      } satisfies ServerMessage);
    }
  }

  private triggerBotTurn(roomCode: string): void {
    const room = this.rooms.getRoom(roomCode);
    if (!room) return;

    this.botManager.scheduleBotTurn(
      room,
      (state, playerId) => this.rooms.getPlayerView(state, playerId),
      (code, events, stateBefore) => this.broadcastGameState(code, events, stateBefore),
      (r, events, state) => this.processGameOver(r, events, state),
      (playerId, action, stateBefore, result) => this.loggers.get(roomCode)?.logAction(playerId, action, stateBefore, result),
    );
  }

  private broadcastGameState(roomCode: string, events?: GameEvent[], stateBefore?: GameState): void {
    const room = this.rooms.getRoom(roomCode);
    if (!room || !room.gameState) return;

    for (const p of room.players) {
      const view = this.rooms.getPlayerView(room.gameState, p.id);
      const playerEvents = events && events.length > 0 && stateBefore
        ? filterEventsForPlayer(events, p.id, stateBefore)
        : events;
      this.connections.send(p.id, {
        type: 'GAME_STATE',
        state: view,
        ...(playerEvents && playerEvents.length > 0 ? { events: playerEvents } : {}),
      } satisfies ServerMessage);
    }
  }

  private broadcastTournamentUpdate(roomCode: string): void {
    const room = this.rooms.getRoom(roomCode);
    if (!room) return;

    const tournament = this.rooms.getTournamentView(roomCode);
    if (!tournament) return;

    for (const p of room.players) {
      this.connections.send(p.id, {
        type: 'TOURNAMENT_UPDATE',
        tournament,
      } satisfies ServerMessage);
    }
  }

  private async persistNewTournament(room: Room): Promise<void> {
    try {
      const dbSessionId = await saveTournament(room.tournament.id, room.code, room.mode);
      room.dbSessionId = dbSessionId;
      const players = room.players.map(p => ({
        userId: extractUserId(p.id),
        playerName: p.name,
      }));
      await saveSessionPlayers(dbSessionId, players);
    } catch (err) {
      console.error('[DB] Failed to persist tournament:', err);
    }
  }

  private async persistRoundAndScores(room: Room, winnerId: string, loserId: string, points: number, reversed: boolean, finishingCard: string): Promise<void> {
    if (room.dbSessionId === null) return;
    try {
      const winnerPlayer = room.players.find(p => p.id === winnerId);
      const loserPlayer = room.players.find(p => p.id === loserId);
      const roundNumber = room.tournament.rounds.length;
      await saveRound(
        room.dbSessionId,
        roundNumber,
        room.cardsPerPlayer,
        winnerPlayer?.name ?? winnerId,
        loserPlayer?.name ?? loserId,
        points,
        reversed,
        finishingCard,
      );
      // Also persist current scores so leaderboard updates even if session is never ended
      const userIdMap = new Map<string, number | null>();
      for (const p of room.players) {
        userIdMap.set(p.id, extractUserId(p.id));
      }
      await saveScores(room.dbSessionId, room.tournament.playerScores, userIdMap);

      // Save per-player score snapshots for history graph
      await saveScoreSnapshots(
        room.dbSessionId,
        roundNumber,
        room.tournament.playerScores.map(score => ({
          userId: extractUserId(score.playerId),
          netScore: score.netScore,
          plusClusters: score.plusClusters,
          minusClusters: score.minusClusters,
        })),
      );
    } catch (err) {
      console.error('[DB] Failed to persist round:', err);
    }
  }

  private async persistEndSession(room: Room): Promise<void> {
    if (room.dbSessionId === null) return;
    try {
      const userIdMap = new Map<string, number | null>();
      for (const p of room.players) {
        userIdMap.set(p.id, extractUserId(p.id));
      }
      await saveScores(room.dbSessionId, room.tournament.playerScores, userIdMap);
      await endTournament(room.dbSessionId);
    } catch (err) {
      console.error('[DB] Failed to persist end session:', err);
    }
  }

  private sendTo(ws: WebSocket, msg: ServerMessage): void {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify(msg));
    }
  }
}
