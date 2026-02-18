import type { Card, Suit } from './card.js';
import type { Action } from './actions.js';

export type Direction = 1 | -1; // 1 = clockwise, -1 = counter-clockwise

export type GamePhase = 'waiting' | 'playing' | 'finished';

export interface RevealedCard {
  card: Card;
  playerId: string;
}

export interface PendingChain {
  type: 'seven-chain';
  penalty: number; // accumulated draw penalty
  suit: Suit; // suit of the initiating 7 (for standard mode 8/10 matching)
}

export interface PendingAce {
  type: 'ace-chain';
  suit: Suit; // suit of the last Ace played
  acesPlayed: number; // count of Aces in this chain
}

export interface PendingPenalty {
  type: 'seven-penalty';
  penalty: number; // minimum cards to draw (e.g. 2)
  drawn: number; // cards drawn so far
  suit: Suit; // preserved from the chain
}

export interface PendingQueenReveal {
  type: 'queen-reveal';
  targetPlayerId: string; // the player who must reveal a card
}

export interface PendingJackDeclare {
  type: 'jack-declare';
}

export type PendingEffect = PendingChain | PendingAce | PendingPenalty | PendingQueenReveal | PendingJackDeclare;

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  revealedCards: Card[]; // cards revealed by Queen, visible to all
  lockedCards: Card[]; // cards that can't be played this turn (just revealed)
  hasAnnouncedOneCard: boolean;
}

export type GameMode = 'standard' | 'freestyle';

export interface GameState {
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  direction: Direction;
  deck: Card[];
  discardPile: Card[];
  pendingEffect: PendingEffect | null;
  dealerId: string;
  cardsPerPlayer: number; // 2-7, set at start
  mode: GameMode;
  lastAction: Action | null;
  hasDrawnThisTurn: boolean;
  winner: string | null; // playerId
  losers: string[]; // playerIds (can be multiple on tie reversal)
  finishingCard: Card | null;
  pendingWinner: { playerId: string; card: Card } | null;
}
