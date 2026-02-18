import type { GameState } from './game-state.js';
import type { GameEvent } from './events.js';

export interface ActionSuccess {
  ok: true;
  newState: GameState;
  events: GameEvent[];
}

export interface ActionFailure {
  ok: false;
  reason: string;
}

export type ActionResult = ActionSuccess | ActionFailure;
