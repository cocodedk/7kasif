import type { TournamentView, RoundResult } from '@hafte-kasif/shared';
import { applyPoints } from '@hafte-kasif/shared';
import type { Room } from './RoomManager.js';

export function recordRoundResult(
  room: Room,
  winnerId: string,
  loserId: string,
  points: number,
  reversed: boolean,
  finishingCardValue: string,
  isAceChainFull: boolean,
): TournamentView | null {
  const roundResult: RoundResult = {
    roundNumber: room.tournament.rounds.length + 1,
    winnerId,
    loserId,
    points,
    reversed,
    finishingCardValue,
    timestamp: new Date().toISOString(),
  };
  room.tournament.rounds.push(roundResult);

  // Apply scoring
  if (reversed) {
    // Winner becomes loser, losers become winners
    const winnerScore = room.tournament.playerScores.find(s => s.playerId === winnerId);
    if (winnerScore) {
      const idx = room.tournament.playerScores.indexOf(winnerScore);
      room.tournament.playerScores[idx] = applyPoints(winnerScore, 'X', points);
    }
    // All tied losers get winning points
    for (const ps of room.tournament.playerScores) {
      if (ps.playerId !== winnerId) {
        const idx = room.tournament.playerScores.indexOf(ps);
        room.tournament.playerScores[idx] = applyPoints(ps, 'I', points, isAceChainFull);
      }
    }
  } else {
    // Normal: winner gets I, loser gets X
    const winnerScore = room.tournament.playerScores.find(s => s.playerId === winnerId);
    if (winnerScore) {
      const idx = room.tournament.playerScores.indexOf(winnerScore);
      room.tournament.playerScores[idx] = applyPoints(winnerScore, 'I', points, isAceChainFull);
    }
    const loserScore = room.tournament.playerScores.find(s => s.playerId === loserId);
    if (loserScore) {
      const idx = room.tournament.playerScores.indexOf(loserScore);
      room.tournament.playerScores[idx] = applyPoints(loserScore, 'X', points);
    }
  }

  // Clear game state for next round
  room.gameState = null;

  return getTournamentView(room);
}

export function endSession(room: Room): TournamentView | null {
  room.tournament.isActive = false;
  return getTournamentView(room);
}

export function getTournamentView(room: Room): TournamentView | null {
  return {
    sessionId: room.tournament.id,
    createdAt: room.tournament.createdAt,
    playerScores: room.tournament.playerScores,
    rounds: room.tournament.rounds,
    currentRound: room.tournament.rounds.length + 1,
  };
}
