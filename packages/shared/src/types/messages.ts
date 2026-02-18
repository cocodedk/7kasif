import type { Card } from './card.js';
import type { GameMode } from './game-state.js';
import type { Action } from './actions.js';
import type { GameEvent, PlayerHandSummary } from './events.js';
import type { TournamentView } from './tournament.js';
import type { PlayerView } from './player-view.js';

// ─── Client Messages ───

export interface CreateRoomMessage {
  type: 'CREATE_ROOM';
  playerName: string;
  mode: GameMode;
  token: string;
}

export interface JoinRoomMessage {
  type: 'JOIN_ROOM';
  roomCode: string;
  playerName: string;
  token: string;
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

export interface AddBotsMessage {
  type: 'ADD_BOTS';
  count: number; // 1-3
}

export type ClientMessage =
  | CreateRoomMessage
  | JoinRoomMessage
  | StartGameMessage
  | PlayerActionMessage
  | NextRoundMessage
  | EndSessionMessage
  | AddBotsMessage;

// ─── Server Messages ───

export type PlayerInfo = { id: string; name: string };

export interface RoomCreatedMessage {
  type: 'ROOM_CREATED';
  roomCode: string;
  playerId: string;
}

export interface RoomJoinedMessage {
  type: 'ROOM_JOINED';
  playerId: string;
  players: PlayerInfo[];
}

export interface GameStateMessage {
  type: 'GAME_STATE';
  state: PlayerView;
  events?: GameEvent[]; // events from the action that produced this state
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
  hands: PlayerHandSummary[];
}

export interface TournamentUpdateMessage {
  type: 'TOURNAMENT_UPDATE';
  tournament: TournamentView;
}

export interface SessionEndedMessage {
  type: 'SESSION_ENDED';
  tournament: TournamentView;
}

export interface DebugGameInitMessage {
  type: 'DEBUG_GAME_INIT';
  deck: Card[];
  dealerId: string;
  cardsPerPlayer: number;
  mode: GameMode;
  players: PlayerInfo[];
}

export type ServerMessage =
  | RoomCreatedMessage
  | RoomJoinedMessage
  | GameStateMessage
  | MoveRejectedMessage
  | GameOverMessage
  | TournamentUpdateMessage
  | SessionEndedMessage
  | DebugGameInitMessage;
