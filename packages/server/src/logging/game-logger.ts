import { mkdirSync, appendFileSync } from 'fs';
import { join } from 'path';
import type { GameState, Action, GameEvent, GameMode, Card } from '@hafte-kasif/shared';

export type LogEntry =
  | { type: 'INIT'; state: GameState; deck: Card[]; players: { id: string; name: string }[]; mode: GameMode; cardsPerPlayer: number; dealerId: string; timestamp: number }
  | { type: 'ACTION'; playerId: string; action: Action; stateBefore: GameState; stateAfter: GameState; events: GameEvent[]; ok: true; timestamp: number }
  | { type: 'ACTION'; playerId: string; action: Action; stateBefore: GameState; ok: false; reason: string; timestamp: number }
  | { type: 'GAME_OVER'; winnerId: string; loserId: string; points: number; reversed: boolean; finalState: GameState; timestamp: number };

const LOGS_DIR = join(process.cwd(), 'data', 'game-logs');

export class GameLogger {
  readonly filePath: string;

  constructor(roomCode: string) {
    mkdirSync(LOGS_DIR, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    this.filePath = join(LOGS_DIR, `${roomCode}#${ts}.jsonl`);
  }

  private log(entry: LogEntry): void {
    try {
      appendFileSync(this.filePath, JSON.stringify(entry) + '\n');
    } catch (err) {
      console.error('[GameLogger] write failed:', err);
    }
  }

  logInit(state: GameState, deck: Card[], players: { id: string; name: string }[], mode: GameMode, cardsPerPlayer: number, dealerId: string): void {
    this.log({ type: 'INIT', state, deck, players, mode, cardsPerPlayer, dealerId, timestamp: Date.now() });
  }

  logAction(playerId: string, action: Action, stateBefore: GameState, result: { ok: true; newState: GameState; events: GameEvent[] } | { ok: false; reason: string }): void {
    if (result.ok) {
      this.log({ type: 'ACTION', playerId, action, stateBefore, stateAfter: result.newState, events: result.events, ok: true, timestamp: Date.now() });
    } else {
      this.log({ type: 'ACTION', playerId, action, stateBefore, ok: false, reason: result.reason, timestamp: Date.now() });
    }
  }

  logGameOver(winnerId: string, loserId: string, points: number, reversed: boolean, finalState: GameState): void {
    this.log({ type: 'GAME_OVER', winnerId, loserId, points, reversed, finalState, timestamp: Date.now() });
  }
}
