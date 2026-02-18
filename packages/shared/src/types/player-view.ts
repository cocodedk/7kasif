import type { Card, Suit } from './card.js';
import type { Direction, GamePhase, GameMode, PendingEffect } from './game-state.js';

export interface OpponentView {
  id: string;
  name: string;
  cardCount: number;
  revealedCards: Card[];
  hasAnnouncedOneCard: boolean;
}

export interface PlayerView {
  phase: GamePhase;
  myHand: Card[];
  myRevealedCards: Card[]; // my cards revealed by Queen (visible to all)
  opponents: OpponentView[];
  currentPlayerId: string;
  direction: Direction;
  topDiscard: Card | null;
  deckCount: number;
  pendingEffect: PendingEffect | null;
  declaredSuit: Suit | null; // if Jack changed the house
  hasDrawnThisTurn: boolean;
  mode: GameMode;
}
