import type {
  GameState, GameMode, PlayerView, Card,
  TournamentSession, TournamentView,
} from '@hafte-kasif/shared';
import { createInitialState } from '../engine/game.js';
import { createEmptyPlayerScore, shuffleDeck } from '@hafte-kasif/shared';
import { getPlayerView } from './player-view.js';
import {
  recordRoundResult as doRecordRoundResult,
  endSession as doEndSession,
  getTournamentView as doGetTournamentView,
} from './tournament.js';

interface RoomPlayer {
  id: string;
  name: string;
}

export interface Room {
  code: string;
  players: RoomPlayer[];
  hostId: string;
  mode: GameMode;
  gameState: GameState | null;
  tournament: TournamentSession;
  createdAt: number;
  lastActivityAt: number;
  dbSessionId: number | null;
  cardsPerPlayer: number;
}

const ROOM_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export class RoomManager {
  private rooms = new Map<string, Room>();

  createRoom(hostId: string, hostName: string, mode: GameMode): Room {
    // Remove player from any existing rooms
    this.removePlayerFromAllRooms(hostId);
    const code = this.generateCode();
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const room: Room = {
      code,
      players: [{ id: hostId, name: hostName }],
      hostId,
      mode,
      gameState: null,
      tournament: {
        id: sessionId,
        createdAt: new Date().toISOString(),
        roomCode: code,
        mode,
        playerScores: [],
        rounds: [],
        isActive: true,
      },
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      dbSessionId: null,
      cardsPerPlayer: 0,
    };
    this.rooms.set(code, room);
    return room;
  }

  joinRoom(code: string, playerId: string, playerName: string): Room | null {
    const room = this.rooms.get(code);
    if (!room) return null;
    // Reconnection: player already in room — allow regardless of game state
    if (room.players.some(p => p.id === playerId)) return room;
    // New player: block if game in progress or room full
    if (room.gameState) return null;
    if (room.players.length >= 4) return null;

    // Remove player from any other rooms before joining
    this.removePlayerFromAllRooms(playerId);
    room.players.push({ id: playerId, name: playerName });
    room.lastActivityAt = Date.now();
    return room;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  getRoomByPlayerId(playerId: string): Room | undefined {
    let fallback: Room | undefined;
    for (const room of this.rooms.values()) {
      if (room.players.some(p => p.id === playerId)) {
        // Prefer rooms with an active game
        if (room.gameState) return room;
        fallback ??= room;
      }
    }
    return fallback;
  }

  startGame(code: string, cardsPerPlayer: number): { state: GameState; deck: Card[] } | null {
    const room = this.rooms.get(code);
    if (!room) return null;
    if (room.players.length < 3) return null;
    if (room.gameState && room.gameState.phase === 'playing') return null;
    if (cardsPerPlayer < 2 || cardsPerPlayer > 7) return null;

    // Initialize tournament scores on first round
    if (room.tournament.playerScores.length === 0) {
      room.tournament.playerScores = room.players.map(p =>
        createEmptyPlayerScore(p.id, p.name)
      );
    }

    // Loser of previous round becomes dealer; first round: host is dealer
    let dealerId: string;
    const lastRound = room.tournament.rounds[room.tournament.rounds.length - 1];
    if (lastRound) {
      dealerId = lastRound.reversed ? lastRound.winnerId : lastRound.loserId;
    } else {
      dealerId = room.players[0].id;
    }

    // Capture the shuffled deck for debug logging
    let initialDeck: Card[] = [];
    const captureShuffle = (deck: Card[]) => {
      const shuffled = shuffleDeck(deck);
      initialDeck = [...shuffled];
      return shuffled;
    };

    const state = createInitialState(
      room.players.map(p => ({ id: p.id, name: p.name })),
      dealerId,
      cardsPerPlayer,
      room.mode,
      captureShuffle,
    );

    room.gameState = state;
    room.cardsPerPlayer = cardsPerPlayer;
    room.lastActivityAt = Date.now();
    return { state, deck: initialDeck };
  }

  recordRoundResult(
    code: string,
    winnerId: string,
    loserId: string,
    points: number,
    reversed: boolean,
    finishingCardValue: string,
    isAceChainFull: boolean,
  ): TournamentView | null {
    const room = this.rooms.get(code);
    if (!room) return null;
    return doRecordRoundResult(room, winnerId, loserId, points, reversed, finishingCardValue, isAceChainFull);
  }

  endSession(code: string): TournamentView | null {
    const room = this.rooms.get(code);
    if (!room) return null;
    return doEndSession(room);
  }

  getTournamentView(code: string): TournamentView | null {
    const room = this.rooms.get(code);
    if (!room) return null;
    return doGetTournamentView(room);
  }

  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  getRoomCodes(): Set<string> {
    return new Set(this.rooms.keys());
  }

  removeRoom(code: string): void {
    this.rooms.delete(code);
  }

  private removePlayerFromAllRooms(playerId: string): void {
    for (const [code, room] of this.rooms) {
      if (room.gameState) continue;
      room.players = room.players.filter(p => p.id !== playerId);
      if (room.players.length === 0) {
        this.rooms.delete(code);
      } else if (room.hostId === playerId) {
        room.hostId = room.players[0].id;
      }
    }
  }

  removePlayer(code: string, playerId: string): void {
    const room = this.rooms.get(code);
    if (!room) return;
    room.players = room.players.filter(p => p.id !== playerId);
    if (room.players.length === 0) {
      this.rooms.delete(code);
    }
  }

  cleanup(): void {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      if (now - room.lastActivityAt > ROOM_TIMEOUT_MS) {
        this.rooms.delete(code);
      }
    }
  }

  getPlayerView(state: GameState, playerId: string): PlayerView {
    return getPlayerView(state, playerId);
  }

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code: string;
    do {
      code = Array.from({ length: 4 }, () =>
        chars[Math.floor(Math.random() * chars.length)]
      ).join('');
    } while (this.rooms.has(code));
    return code;
  }
}
