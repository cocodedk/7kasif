import type { Card, Suit } from './card.js';

export interface PlayCardAction {
  type: 'PLAY_CARD';
  card: Card;
  declaredSuit?: Suit; // required when playing a Jack
  giveCard?: Card; // required when playing a 2 (give to next player)
  chainChoice?: 'redirect' | 'add'; // required when playing 8 in a chain
}

export interface DrawCardAction {
  type: 'DRAW_CARD';
}

export interface PassTurnAction {
  type: 'PASS_TURN';
}

export interface AnnounceOneCardAction {
  type: 'ANNOUNCE_ONE_CARD';
}

export interface ChallengeNoAnnouncementAction {
  type: 'CHALLENGE_NO_ANNOUNCEMENT';
  targetPlayerId: string;
}

export interface RevealCardAction {
  type: 'REVEAL_CARD';
  card: Card;
}

export interface DeclareSuitAction {
  type: 'DECLARE_SUIT';
  suit: Suit;
}

export type Action =
  | PlayCardAction
  | DrawCardAction
  | PassTurnAction
  | AnnounceOneCardAction
  | ChallengeNoAnnouncementAction
  | RevealCardAction
  | DeclareSuitAction;
