import type { GameState, Card, GameEvent, PlayCardAction } from '@hafte-kasif/shared';
import { handValue, FINISH_POINTS } from '@hafte-kasif/shared';

export function calculateGameEnd(state: GameState, winnerId: string, finishingCard: Card): GameEvent[] {
  const events: GameEvent[] = [];

  // Determine points based on finishing card
  let points: number;
  if (finishingCard.value === 'jack') {
    points = FINISH_POINTS.jack;
  } else if (finishingCard.value === 2) {
    // Check if it was the very last card (no give happened)
    const winner = state.players.find(p => p.id === winnerId)!;
    if (winner.hand.length === 0) {
      // Need to check if a card was given — tracked via lastAction
      const lastAction = state.lastAction as PlayCardAction;
      points = lastAction.giveCard ? FINISH_POINTS.two_with_give : FINISH_POINTS.two_empty;
    } else {
      points = FINISH_POINTS.normal;
    }
  } else {
    points = FINISH_POINTS.normal;
  }

  // Check for 4-Ace chain finish
  if (state.pendingEffect?.type === 'ace-chain' && state.pendingEffect.acesPlayed === 4) {
    points = FINISH_POINTS.ace_chain_full;
  }

  // Find loser(s) — 7s in hand take priority
  const otherPlayers = state.players.filter(p => p.id !== winnerId);

  // Count 7s in each player's hand
  const withSevens = otherPlayers
    .map(p => ({ player: p, sevens: p.hand.filter(c => c.value === 7).length }))
    .filter(p => p.sevens > 0);

  let candidates: { player: typeof otherPlayers[0]; value: number }[];

  if (withSevens.length > 0) {
    // Players with 7s are the loser candidates
    const maxSevens = Math.max(...withSevens.map(p => p.sevens));
    const topSevens = withSevens.filter(p => p.sevens === maxSevens);

    if (topSevens.length === 1) {
      // One player has the most 7s — they lose
      candidates = [{ player: topSevens[0].player, value: handValue(topSevens[0].player.hand) }];
    } else {
      // Tied on 7 count — compare hand values among them
      candidates = topSevens.map(p => ({ player: p.player, value: handValue(p.player.hand) }));
      const maxVal = Math.max(...candidates.map(c => c.value));
      candidates = candidates.filter(c => c.value === maxVal);
    }
  } else {
    // No one has 7s — normal hand value comparison
    candidates = otherPlayers.map(p => ({ player: p, value: handValue(p.hand) }));
    const maxVal = Math.max(...candidates.map(c => c.value));
    candidates = candidates.filter(c => c.value === maxVal);
  }

  let reversed = false;
  if (candidates.length > 1) {
    // Tie — reversal!
    reversed = true;
  }

  const loserIds = candidates.map(l => l.player.id);

  state.phase = 'finished';
  state.winner = reversed ? null : winnerId;
  state.losers = reversed ? [winnerId] : loserIds;
  state.finishingCard = finishingCard;

  // Build hand summaries for all non-winner players
  const hands = otherPlayers.map(p => ({
    playerId: p.id,
    playerName: p.name,
    handValue: handValue(p.hand),
    sevens: p.hand.filter(c => c.value === 7).length,
    cardCount: p.hand.length,
  }));

  events.push({
    type: 'GAME_OVER',
    winnerId,
    loserId: reversed ? winnerId : loserIds[0],
    points,
    reversed,
    hands,
  });

  return events;
}
