import type { Card, Suit } from './card.js';
import type { Direction } from './game-state.js';

export interface CardPlayedEvent {
  type: 'CARD_PLAYED';
  playerId: string;
  card: Card;
}

export interface CardDrawnEvent {
  type: 'CARD_DRAWN';
  playerId: string;
  count: number;
}

export interface CardGivenEvent {
  type: 'CARD_GIVEN';
  fromPlayerId: string;
  toPlayerId: string;
  card: Card | null;
}

export interface TurnPassedEvent {
  type: 'TURN_PASSED';
  playerId: string;
}

export interface DirectionReversedEvent {
  type: 'DIRECTION_REVERSED';
  newDirection: Direction;
}

export interface PlayerSkippedEvent {
  type: 'PLAYER_SKIPPED';
  playerId: string;
}

export interface CardRevealedEvent {
  type: 'CARD_REVEALED';
  playerId: string;
  card: Card;
}

export interface HouseChangedEvent {
  type: 'HOUSE_CHANGED';
  newSuit: Suit;
}

export interface ChainReactionEvent {
  type: 'CHAIN_REACTION';
  penalty: number;
  targetPlayerId: string;
}

export interface DeckReshuffledEvent {
  type: 'DECK_RESHUFFLED';
}

export interface OneCardAnnouncedEvent {
  type: 'ONE_CARD_ANNOUNCED';
  playerId: string;
}

export interface AnnouncementChallengedEvent {
  type: 'ANNOUNCEMENT_CHALLENGED';
  challengerId: string;
  targetPlayerId: string;
  penalty: boolean; // true if penalty applied
}

export interface PlayerHandSummary {
  playerId: string;
  playerName: string;
  handValue: number;
  sevens: number;
  cardCount: number;
}

export interface GameOverEvent {
  type: 'GAME_OVER';
  winnerId: string;
  loserId: string;
  points: number;
  reversed: boolean;
  hands: PlayerHandSummary[]; // all non-winner players' hand info
}

export type GameEvent =
  | CardPlayedEvent
  | CardDrawnEvent
  | CardGivenEvent
  | TurnPassedEvent
  | DirectionReversedEvent
  | PlayerSkippedEvent
  | CardRevealedEvent
  | HouseChangedEvent
  | ChainReactionEvent
  | DeckReshuffledEvent
  | OneCardAnnouncedEvent
  | AnnouncementChallengedEvent
  | GameOverEvent;
