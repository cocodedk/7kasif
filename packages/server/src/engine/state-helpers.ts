import type { GameState, Card, Player, GameEvent } from '@hafte-kasif/shared';
import { cardEquals } from '@hafte-kasif/shared';

export function cloneState(state: GameState): GameState {
  return {
    ...state,
    players: state.players.map(p => ({
      ...p,
      hand: [...p.hand],
      revealedCards: [...p.revealedCards],
      lockedCards: [...p.lockedCards],
    })),
    deck: [...state.deck],
    discardPile: [...state.discardPile],
    pendingEffect: state.pendingEffect ? { ...state.pendingEffect } : null,
    pendingWinner: state.pendingWinner ? { ...state.pendingWinner } : null,
    losers: [...state.losers],
  };
}

export function getPlayerIndex(state: GameState, playerId: string): number {
  return state.players.findIndex(p => p.id === playerId);
}

export function nextPlayerIndex(state: GameState, from: number, steps: number = 1): number {
  const count = state.players.length;
  return ((from + state.direction * steps) % count + count) % count;
}

export function removeCardFromHand(player: Player, card: Card): void {
  const idx = player.hand.findIndex(c => cardEquals(c, card));
  if (idx !== -1) player.hand.splice(idx, 1);
  // Also remove from revealed if it was revealed
  const revIdx = player.revealedCards.findIndex(c => cardEquals(c, card));
  if (revIdx !== -1) player.revealedCards.splice(revIdx, 1);
  // Also remove from locked if it was locked
  const lockIdx = player.lockedCards.findIndex(c => cardEquals(c, card));
  if (lockIdx !== -1) player.lockedCards.splice(lockIdx, 1);
}

export function drawCards(state: GameState, playerIndex: number, count: number): GameEvent[] {
  const events: GameEvent[] = [];
  const player = state.players[playerIndex];
  for (let i = 0; i < count; i++) {
    if (state.deck.length === 0) {
      if (reshuffleDeck(state)) {
        events.push({ type: 'DECK_RESHUFFLED' });
      }
    }
    if (state.deck.length === 0) break; // truly empty
    const card = state.deck.pop()!;
    player.hand.push(card);
  }
  events.push({ type: 'CARD_DRAWN', playerId: player.id, count });
  // Reset one-card announcement if they now have more than 1
  if (player.hand.length > 1) {
    player.hasAnnouncedOneCard = false;
  }
  return events;
}

export function reshuffleDeck(state: GameState): boolean {
  if (state.discardPile.length <= 1) return false;
  const topCard = state.discardPile.pop()!;
  const cards = state.discardPile.splice(0);
  // Shuffle
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  state.deck.push(...cards);
  state.discardPile = [topCard];
  return true;
}

export function advanceTurn(state: GameState, steps: number = 1): void {
  state.currentPlayerIndex = nextPlayerIndex(state, state.currentPlayerIndex, steps);
  // Clear lockedCards for the player whose turn it now is
  state.players[state.currentPlayerIndex].lockedCards = [];
  // Reset draw flag for the new turn
  state.hasDrawnThisTurn = false;
}
