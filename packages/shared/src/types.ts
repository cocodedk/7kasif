// ─── Card Types ───

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

export type Value = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 'jack' | 'queen' | 'king' | 'ace';

export interface Card {
  suit: Suit;
  value: Value;
}

// ─── Game State ───

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

export type PendingEffect = PendingChain | PendingAce;

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  revealedCards: Card[]; // cards revealed by Queen, visible to all
  hasAnnouncedOneCard: boolean;
}

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
  winner: string | null; // playerId
  losers: string[]; // playerIds (can be multiple on tie reversal)
  finishingCard: Card | null;
}

export type GameMode = 'standard' | 'freestyle';

// ─── Actions ───

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

export type Action =
  | PlayCardAction
  | DrawCardAction
  | PassTurnAction
  | AnnounceOneCardAction
  | ChallengeNoAnnouncementAction;

// ─── Game Events ───

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
  card: Card;
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

export interface GameOverEvent {
  type: 'GAME_OVER';
  winnerId: string;
  loserId: string;
  points: number;
  reversed: boolean;
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
  | OneCardAnnouncedEvent
  | AnnouncementChallengedEvent
  | GameOverEvent;

// ─── Result Types ───

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

// ─── Tournament / Session ───

export type CellMarker = 'I' | 'X';

export interface ScoreRow {
  cells: (CellMarker | null)[]; // always length 4
}

export interface PlayerScore {
  playerId: string;
  playerName: string;
  rows: ScoreRow[];
  plusClusters: number; // completed rows of all I
  minusClusters: number; // completed rows of all X
  netScore: number; // plusClusters - minusClusters
}

export interface RoundResult {
  roundNumber: number;
  winnerId: string;
  loserId: string; // or winner if reversed
  points: number;
  reversed: boolean;
  finishingCardValue: string;
  timestamp: string;
}

export interface TournamentSession {
  id: string;
  createdAt: string;
  roomCode: string;
  mode: GameMode;
  playerScores: PlayerScore[];
  rounds: RoundResult[];
  isActive: boolean;
}

export interface TournamentView {
  sessionId: string;
  createdAt: string;
  playerScores: PlayerScore[];
  rounds: RoundResult[];
  currentRound: number;
}

// ─── Message Protocol (Client <-> Server) ───

export interface CreateRoomMessage {
  type: 'CREATE_ROOM';
  playerName: string;
  mode: GameMode;
}

export interface JoinRoomMessage {
  type: 'JOIN_ROOM';
  roomCode: string;
  playerName: string;
}

export interface StartGameMessage {
  type: 'START_GAME';
  cardsPerPlayer: number; // 2-7
}

export interface PlayerActionMessage {
  type: 'PLAYER_ACTION';
  action: Action;
}

export interface NextRoundMessage {
  type: 'NEXT_ROUND';
  cardsPerPlayer: number;
}

export interface EndSessionMessage {
  type: 'END_SESSION';
}

export type ClientMessage =
  | CreateRoomMessage
  | JoinRoomMessage
  | StartGameMessage
  | PlayerActionMessage
  | NextRoundMessage
  | EndSessionMessage;

export interface RoomCreatedMessage {
  type: 'ROOM_CREATED';
  roomCode: string;
  playerId: string;
}

export interface RoomJoinedMessage {
  type: 'ROOM_JOINED';
  playerId: string;
  players: { id: string; name: string }[];
}

export interface GameStateMessage {
  type: 'GAME_STATE';
  state: PlayerView;
}

export interface MoveRejectedMessage {
  type: 'MOVE_REJECTED';
  reason: string;
}

export interface GameOverMessage {
  type: 'GAME_OVER';
  winnerId: string;
  loserId: string;
  points: number;
  reversed: boolean;
}

export interface TournamentUpdateMessage {
  type: 'TOURNAMENT_UPDATE';
  tournament: TournamentView;
}

export interface SessionEndedMessage {
  type: 'SESSION_ENDED';
  tournament: TournamentView;
}

export type ServerMessage =
  | RoomCreatedMessage
  | RoomJoinedMessage
  | GameStateMessage
  | MoveRejectedMessage
  | GameOverMessage
  | TournamentUpdateMessage
  | SessionEndedMessage;

// ─── Player View (filtered state — hides other players' cards) ───

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
  opponents: OpponentView[];
  currentPlayerId: string;
  direction: Direction;
  topDiscard: Card | null;
  deckCount: number;
  pendingEffect: PendingEffect | null;
  declaredSuit: Suit | null; // if Jack changed the house
  mode: GameMode;
}
