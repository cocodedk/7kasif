import { mkdirSync, appendFileSync } from 'fs';
import { createHash } from 'crypto';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { PlayerView, Action, GameOverMessage, GameEvent, Card, GameMode } from '@hafte-kasif/shared';

export type LogEntry =
  | { type: 'INIT'; deck: Card[]; dealerId: string; cardsPerPlayer: number; mode: GameMode; players: { id: string; name: string }[]; timestamp: number }
  | { type: 'GAME_STATE'; bot: string; playerId: string; view: PlayerView; timestamp: number }
  | { type: 'ACTION'; bot: string; playerId: string; action: Action; timestamp: number }
  | { type: 'REJECTED'; bot: string; playerId: string; reason: string; action?: Action; timestamp: number }
  | { type: 'GAME_OVER'; data: GameOverMessage; timestamp: number }
  | { type: 'EVENT'; bot: string; events: GameEvent[]; timestamp: number };

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOGS_DIR = join(__dirname, 'logs');

export class GameLogger {
  readonly filePath: string;
  readonly roomCode: string;
  readonly hash: string;

  constructor(roomCode: string) {
    mkdirSync(LOGS_DIR, { recursive: true });
    this.roomCode = roomCode;
    this.hash = createHash('sha256')
      .update(`${roomCode}-${Date.now()}-${Math.random()}`)
      .digest('hex')
      .slice(0, 8);
    this.filePath = join(LOGS_DIR, `${roomCode}#${this.hash}.jsonl`);
  }

  log(entry: LogEntry): void {
    appendFileSync(this.filePath, JSON.stringify(entry) + '\n');
  }

  logInit(deck: Card[], dealerId: string, cardsPerPlayer: number, mode: GameMode, players: { id: string; name: string }[]): void {
    this.log({ type: 'INIT', deck, dealerId, cardsPerPlayer, mode, players, timestamp: Date.now() });
  }

  logGameState(bot: string, playerId: string, view: PlayerView): void {
    this.log({ type: 'GAME_STATE', bot, playerId, view, timestamp: Date.now() });
  }

  logAction(bot: string, playerId: string, action: Action): void {
    this.log({ type: 'ACTION', bot, playerId, action, timestamp: Date.now() });
  }

  logRejected(bot: string, playerId: string, reason: string, action?: Action): void {
    this.log({ type: 'REJECTED', bot, playerId, reason, action, timestamp: Date.now() });
  }

  logGameOver(data: GameOverMessage): void {
    this.log({ type: 'GAME_OVER', data, timestamp: Date.now() });
  }

  logEvents(bot: string, events: GameEvent[]): void {
    if (events.length > 0) {
      this.log({ type: 'EVENT', bot, events, timestamp: Date.now() });
    }
  }
}
