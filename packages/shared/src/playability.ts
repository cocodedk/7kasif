import type { Card, PlayerView, Suit } from './types.js';

/**
 * Check if a card can be legally played given the current player view.
 * Mirrors the server validator logic but works with PlayerView instead of GameState.
 */
export function isCardPlayable(card: Card, view: PlayerView): boolean {
  // During queen-reveal: no cards playable (must reveal first)
  if (view.pendingEffect?.type === 'queen-reveal') {
    return false;
  }

  // During seven-penalty: no cards playable until minimum drawn
  if (view.pendingEffect?.type === 'seven-penalty') {
    if (view.pendingEffect.drawn < view.pendingEffect.penalty) {
      return false;
    }
    // After minimum drawn: normal playability rules (fall through below)
  }

  // During a 7-chain: only 7, 8, 10 (with suit restrictions in standard mode)
  if (view.pendingEffect?.type === 'seven-chain') {
    if (card.value === 7) return true;
    if (view.mode === 'freestyle') {
      return card.value === 8 || card.value === 10;
    }
    // Standard mode: 8 and 10 must match the chain suit
    if (card.value === 8 && card.suit === view.pendingEffect.suit) return true;
    if (card.value === 10 && card.suit === view.pendingEffect.suit) return true;
    return false;
  }

  // During an ace-chain: aces, jacks, or matching suit
  if (view.pendingEffect?.type === 'ace-chain') {
    if (card.value === 'ace') return true;
    if (card.value === 'jack') return true;
    if (card.suit === view.pendingEffect.suit) return true;
    return false;
  }

  // Jack is always playable
  if (card.value === 'jack') return true;

  const top = view.topDiscard;
  if (!top) return true;

  // If there's a declared suit (from a Jack), match that or the top value
  if (view.declaredSuit) {
    if (card.suit === view.declaredSuit) return true;
    if (card.value === top.value) return true;
    return false;
  }

  // Normal: match suit or value
  if (card.suit === top.suit) return true;
  if (card.value === top.value) return true;

  return false;
}
