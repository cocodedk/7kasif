import type { WebSocket } from 'ws';
import type { ClientMessage, ServerMessage, Action } from '@hafte-kasif/shared';
import { FINISH_POINTS } from '@hafte-kasif/shared';
import { ConnectionManager } from './ConnectionManager.js';
import { RoomManager } from './RoomManager.js';
import { applyAction } from '../engine/game.js';
import { filterEventsForPlayer } from '../engine/view.js';
import { verifyToken } from '../auth/auth.js';

export class MessageHandler {
  constructor(
    private connections: ConnectionManager,
    private rooms: RoomManager,
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
    console.log(`[MSG] type=${msg.type} playerId=${playerId || 'NONE'}`);

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
    }
  }

  private resolvePlayerId(token?: string): { playerId: string; userId: number } | null {
    if (process.env.DEBUG_GAME_LOG) {
      console.log(`[AUTH] resolvePlayerId token=${token ? 'PRESENT' : 'MISSING'}`);
    }
    if (token) {
      try {
        const decoded = verifyToken(token);
        console.log(`[AUTH] verified userId=${decoded.userId}`);
        return { playerId: `user_${decoded.userId}`, userId: decoded.userId };
      } catch (err: any) {
        console.error(`[AUTH] verifyToken failed:`, err.message);
      }
    }
    return null;
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
    const room = this.rooms.getRoomByPlayerId(playerId);
    if (!room) return;
    if (room.hostId !== playerId) {
      this.connections.send(playerId, {
        type: 'MOVE_REJECTED',
        reason: 'Only the host can start the game',
      });
      return;
    }

    const result = this.rooms.startGame(room.code, cardsPerPlayer);
    if (!result) {
      this.connections.send(playerId, {
        type: 'MOVE_REJECTED',
        reason: 'Cannot start game (need 3-4 players, valid card count)',
      });
      return;
    }

    // Send debug game init info (env-gated)
    if (process.env.DEBUG_GAME_LOG) {
      for (const p of room.players) {
        this.connections.send(p.id, {
          type: 'DEBUG_GAME_INIT',
          deck: result.deck,
          dealerId: result.state.dealerId,
          cardsPerPlayer,
          mode: room.mode,
          players: room.players.map(pp => ({ id: pp.id, name: pp.name })),
        } satisfies import('@hafte-kasif/shared').ServerMessage);
      }
    }

    this.broadcastGameState(room.code);
    this.broadcastTournamentUpdate(room.code);
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

    // Check for game over — record round result in tournament
    const gameOverEvent = result.events.find(e => e.type === 'GAME_OVER');
    if (gameOverEvent && gameOverEvent.type === 'GAME_OVER') {
      const finishingCard = result.newState.finishingCard;
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

      for (const p of room.players) {
        this.connections.send(p.id, {
          type: 'GAME_OVER',
          winnerId: gameOverEvent.winnerId,
          loserId: gameOverEvent.loserId,
          points: gameOverEvent.points,
          reversed: gameOverEvent.reversed,
          hands: gameOverEvent.hands,
        } satisfies ServerMessage);
      }

      this.broadcastTournamentUpdate(room.code);
    }
  }

  private handleNextRound(playerId: string, cardsPerPlayer: number): void {
    const room = this.rooms.getRoomByPlayerId(playerId);
    if (!room) return;
    if (room.hostId !== playerId) {
      this.connections.send(playerId, {
        type: 'MOVE_REJECTED',
        reason: 'Only the host can start the next round',
      });
      return;
    }

    const result = this.rooms.startGame(room.code, cardsPerPlayer);
    if (!result) {
      this.connections.send(playerId, {
        type: 'MOVE_REJECTED',
        reason: 'Cannot start next round',
      });
      return;
    }

    // Send debug game init info (env-gated)
    if (process.env.DEBUG_GAME_LOG) {
      for (const p of room.players) {
        this.connections.send(p.id, {
          type: 'DEBUG_GAME_INIT',
          deck: result.deck,
          dealerId: result.state.dealerId,
          cardsPerPlayer,
          mode: room.mode,
          players: room.players.map(pp => ({ id: pp.id, name: pp.name })),
        } satisfies import('@hafte-kasif/shared').ServerMessage);
      }
    }

    this.broadcastGameState(room.code);
    this.broadcastTournamentUpdate(room.code);
  }

  private handleEndSession(playerId: string): void {
    const room = this.rooms.getRoomByPlayerId(playerId);
    if (!room) return;
    if (room.hostId !== playerId) {
      this.connections.send(playerId, {
        type: 'MOVE_REJECTED',
        reason: 'Only the host can end the session',
      });
      return;
    }

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

  private broadcastGameState(roomCode: string, events?: import('@hafte-kasif/shared').GameEvent[], stateBefore?: import('@hafte-kasif/shared').GameState): void {
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

  private sendTo(ws: WebSocket, msg: ServerMessage): void {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify(msg));
    }
  }
}
