import type {
  GameState, GameMode, PlayerView, OpponentView, Card,
  TournamentSession, TournamentView, PlayerScore, RoundResult,
} from '@hafte-kasif/shared';
import { createInitialState } from '../engine/game.js';
import { createEmptyPlayerScore, applyPoints, shuffleDeck } from '@hafte-kasif/shared';

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
    };
    this.rooms.set(code, room);
    return room;
  }

  joinRoom(code: string, playerId: string, playerName: string): Room | null {
    const room = this.rooms.get(code);
    if (!room) return null;
    if (room.gameState) return null;
    if (room.players.length >= 4) return null;
    if (room.players.some(p => p.id === playerId)) return room;

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

    // Rotate dealer: host first round, then next player each round
    const roundNum = room.tournament.rounds.length;
    const dealerIdx = roundNum % room.players.length;
    const dealerId = room.players[dealerIdx].id;

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
    room.lastActivityAt = Date.now();
    return { state, deck: initialDeck };
  }

  /**
   * Record the result of a completed round and update scoring table.
   */
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

    const roundResult: RoundResult = {
      roundNumber: room.tournament.rounds.length + 1,
      winnerId,
      loserId,
      points,
      reversed,
      finishingCardValue,
      timestamp: new Date().toISOString(),
    };
    room.tournament.rounds.push(roundResult);

    // Apply scoring
    if (reversed) {
      // Winner becomes loser, losers become winners
      const winnerScore = room.tournament.playerScores.find(s => s.playerId === winnerId);
      if (winnerScore) {
        const idx = room.tournament.playerScores.indexOf(winnerScore);
        room.tournament.playerScores[idx] = applyPoints(winnerScore, 'X', points);
      }
      // All tied losers get winning points
      // loserId is actually the original winner who now loses
      for (const ps of room.tournament.playerScores) {
        if (ps.playerId !== winnerId) {
          const idx = room.tournament.playerScores.indexOf(ps);
          room.tournament.playerScores[idx] = applyPoints(ps, 'I', points, isAceChainFull);
        }
      }
    } else {
      // Normal: winner gets I, loser gets X
      const winnerScore = room.tournament.playerScores.find(s => s.playerId === winnerId);
      if (winnerScore) {
        const idx = room.tournament.playerScores.indexOf(winnerScore);
        room.tournament.playerScores[idx] = applyPoints(winnerScore, 'I', points, isAceChainFull);
      }
      const loserScore = room.tournament.playerScores.find(s => s.playerId === loserId);
      if (loserScore) {
        const idx = room.tournament.playerScores.indexOf(loserScore);
        room.tournament.playerScores[idx] = applyPoints(loserScore, 'X', points);
      }
    }

    // Clear game state for next round
    room.gameState = null;

    return this.getTournamentView(code);
  }

  endSession(code: string): TournamentView | null {
    const room = this.rooms.get(code);
    if (!room) return null;
    room.tournament.isActive = false;
    return this.getTournamentView(code);
  }

  getTournamentView(code: string): TournamentView | null {
    const room = this.rooms.get(code);
    if (!room) return null;

    return {
      sessionId: room.tournament.id,
      createdAt: room.tournament.createdAt,
      playerScores: room.tournament.playerScores,
      rounds: room.tournament.rounds,
      currentRound: room.tournament.rounds.length + 1,
    };
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
    const me = state.players.find(p => p.id === playerId)!;
    const opponents: OpponentView[] = state.players
      .filter(p => p.id !== playerId)
      .map(p => ({
        id: p.id,
        name: p.name,
        cardCount: p.hand.length,
        revealedCards: p.revealedCards,
        hasAnnouncedOneCard: p.hasAnnouncedOneCard,
      }));

    const topDiscard = state.discardPile.length > 0
      ? state.discardPile[state.discardPile.length - 1]
      : null;

    let declaredSuit = null;
    if (state.lastAction?.type === 'PLAY_CARD' && state.lastAction.card.value === 'jack') {
      declaredSuit = state.lastAction.declaredSuit ?? null;
    }

    return {
      phase: state.phase,
      myHand: me.hand,
      myRevealedCards: me.revealedCards,
      opponents,
      currentPlayerId: state.players[state.currentPlayerIndex].id,
      direction: state.direction,
      topDiscard,
      deckCount: state.deck.length,
      pendingEffect: state.pendingEffect,
      declaredSuit,
      hasDrawnThisTurn: state.hasDrawnThisTurn,
      mode: state.mode,
    };
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
