import type { GameState, PlayerView, OpponentView } from '@hafte-kasif/shared';

export function getPlayerView(state: GameState, playerId: string): PlayerView {
  const me = state.players.find(p => p.id === playerId)!;
  const opponents: OpponentView[] = state.players
    .filter(p => p.id !== playerId)
    .map(p => ({
      id: p.id,
      name: p.name,
      cardCount: p.hand.length,
      revealedCards: p.revealedCards,
      hasAnnouncedOneCard: p.hasAnnouncedOneCard,
    }));

  const topDiscard = state.discardPile.length > 0
    ? state.discardPile[state.discardPile.length - 1]
    : null;

  let declaredSuit = null;
  if (state.lastAction?.type === 'PLAY_CARD' && state.lastAction.card.value === 'jack') {
    declaredSuit = state.lastAction.declaredSuit ?? null;
  }

  return {
    phase: state.phase,
    myHand: me.hand,
    myRevealedCards: me.revealedCards,
    opponents,
    currentPlayerId: state.players[state.currentPlayerIndex].id,
    direction: state.direction,
    topDiscard,
    deckCount: state.deck.length,
    pendingEffect: state.pendingEffect,
    declaredSuit,
    hasDrawnThisTurn: state.hasDrawnThisTurn,
    mode: state.mode,
  };
}
