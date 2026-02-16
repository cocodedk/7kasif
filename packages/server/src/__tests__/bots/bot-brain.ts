import type { PlayerView, Action, Card, Suit } from '@hafte-kasif/shared';
import { isCardPlayable } from '@hafte-kasif/shared';

function cardKey(c: Card): string {
  return `${c.value}:${c.suit}`;
}

export function decideAction(
  view: PlayerView,
  myPlayerId: string,
  hasDrawnThisTurn: boolean,
  rejectedCards: Set<string> = new Set(),
): Action | null {
  if (view.currentPlayerId !== myPlayerId) {
    return null;
  }

  // During queen-reveal: pick the least valuable card to reveal
  if (view.pendingEffect?.type === 'queen-reveal' &&
      view.pendingEffect.targetPlayerId === myPlayerId) {
    // Filter out already-revealed cards
    const revealable = view.myHand.filter(
      c => !view.myRevealedCards?.some(r => r.suit === c.suit && r.value === c.value),
    );
    if (revealable.length === 0) return { type: 'DRAW_CARD' }; // shouldn't happen
    // Pick lowest priority card to reveal (don't reveal special cards)
    const sorted = [...revealable].sort(
      (a, b) => cardNumericValue(a) - cardNumericValue(b),
    );
    return { type: 'REVEAL_CARD', card: sorted[0] };
  }

  const playableCards = view.myHand.filter(
    (card) => isCardPlayable(card, view) && !rejectedCards.has(cardKey(card)),
  );

  // During seven-penalty: draw until minimum met, then decide
  if (view.pendingEffect?.type === 'seven-penalty') {
    if (view.pendingEffect.drawn < view.pendingEffect.penalty) {
      return { type: 'DRAW_CARD' };
    }
    // Minimum met — try to play, or pass
    if (playableCards.length > 0) {
      const card = pickBestCard(playableCards);
      return buildPlayAction(card, view);
    }
    // Optionally draw one more if haven't yet
    if (view.pendingEffect.drawn === view.pendingEffect.penalty) {
      return { type: 'DRAW_CARD' };
    }
    return { type: 'PASS_TURN' };
  }

  if (playableCards.length > 0) {
    const card = pickBestCard(playableCards);
    return buildPlayAction(card, view);
  }

  // No playable cards
  if (!hasDrawnThisTurn) {
    return { type: 'DRAW_CARD' };
  }

  // In 7-chain with no counter, must draw penalty
  if (view.pendingEffect?.type === 'seven-chain') {
    return { type: 'DRAW_CARD' };
  }

  // In ace-chain, must draw (can't pass)
  if (view.pendingEffect?.type === 'ace-chain') {
    return { type: 'DRAW_CARD' };
  }

  return { type: 'PASS_TURN' };
}

function pickBestCard(playable: Card[]): Card {
  const priority = (c: Card): number => {
    if (c.value === 'jack') return 10;
    if (c.value === 'ace') return 7;
    if (c.value === 7) return 8;
    if (c.value === 10) return 6;
    if (c.value === 'king') return 5;
    if (c.value === 'queen') return 4;
    if (c.value === 2) return 3;
    return 1;
  };

  playable.sort((a, b) => priority(b) - priority(a));
  return playable[0];
}

function buildPlayAction(card: Card, view: PlayerView): Action {
  const action: any = { type: 'PLAY_CARD', card };

  // Jack needs declaredSuit
  if (card.value === 'jack') {
    action.declaredSuit = pickBestSuit(view.myHand, card);
  }

  // 2 needs giveCard
  if (card.value === 2 && view.myHand.length > 1) {
    const otherCards = view.myHand.filter(
      (c) => !(c.suit === card.suit && c.value === card.value),
    );
    if (otherCards.length > 0) {
      action.giveCard = otherCards.sort(
        (a, b) => cardNumericValue(b) - cardNumericValue(a),
      )[0];
    }
  }

  // 8 in chain needs chainChoice
  if (card.value === 8 && view.pendingEffect?.type === 'seven-chain') {
    action.chainChoice = 'redirect';
  }

  return action;
}

function pickBestSuit(hand: Card[], excludeCard: Card): Suit {
  const counts: Record<Suit, number> = {
    hearts: 0,
    diamonds: 0,
    clubs: 0,
    spades: 0,
  };

  for (const c of hand) {
    if (c.suit === excludeCard.suit && c.value === excludeCard.value) continue;
    counts[c.suit]++;
  }

  return (Object.entries(counts) as [Suit, number][]).sort(
    (a, b) => b[1] - a[1],
  )[0][0];
}

function cardNumericValue(card: Card): number {
  const vals: Record<string, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
    '8': 8, '9': 9, '10': 10, jack: 11, queen: 12, king: 13, ace: 14,
  };
  return vals[String(card.value)] || 0;
}
