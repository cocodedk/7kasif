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
): TournamentView {
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
    const winnerIdx = room.tournament.playerScores.findIndex(s => s.playerId === winnerId);
    if (winnerIdx !== -1) {
      room.tournament.playerScores[winnerIdx] = applyPoints(room.tournament.playerScores[winnerIdx], 'X', points);
    }
    // All tied losers get winning points
    for (let i = 0; i < room.tournament.playerScores.length; i++) {
      if (room.tournament.playerScores[i].playerId !== winnerId) {
        room.tournament.playerScores[i] = applyPoints(room.tournament.playerScores[i], 'I', points, isAceChainFull);
      }
    }
  } else {
    // Normal: winner gets I, loser gets X
    const winnerIdx = room.tournament.playerScores.findIndex(s => s.playerId === winnerId);
    if (winnerIdx !== -1) {
      room.tournament.playerScores[winnerIdx] = applyPoints(room.tournament.playerScores[winnerIdx], 'I', points, isAceChainFull);
    }
    const loserIdx = room.tournament.playerScores.findIndex(s => s.playerId === loserId);
    if (loserIdx !== -1) {
      room.tournament.playerScores[loserIdx] = applyPoints(room.tournament.playerScores[loserIdx], 'X', points);
    }
  }

  // Clear game state for next round
  room.gameState = null;

  return getTournamentView(room);
}

export function endSession(room: Room): TournamentView {
  room.tournament.isActive = false;
  return getTournamentView(room);
}

export function getTournamentView(room: Room): TournamentView {
  return {
    sessionId: room.tournament.id,
    createdAt: room.tournament.createdAt,
    playerScores: room.tournament.playerScores,
    rounds: room.tournament.rounds,
    currentRound: room.tournament.rounds.length + 1,
  };
}
