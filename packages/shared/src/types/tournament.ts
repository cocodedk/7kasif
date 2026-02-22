import type { GameMode } from './game-state.js';

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

export interface ScoreHistoryEntry {
  sessionId: number;
  roundNumber: number;
  netScore: number;
  plusClusters: number;
  minusClusters: number;
  snapshotAt: string;
}
