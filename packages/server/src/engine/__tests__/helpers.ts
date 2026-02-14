import type { Card, GameState, Suit, Value, Player, PendingEffect } from '@hafte-kasif/shared';
import { createDeck, cardEquals } from '@hafte-kasif/shared';

export function card(value: Value, suit: Suit): Card {
  return { value, suit };
}

export function c(shorthand: string): Card {
  const suitMap: Record<string, Suit> = { h: 'hearts', d: 'diamonds', c: 'clubs', s: 'spades' };
  const suitChar = shorthand[shorthand.length - 1].toLowerCase();
  const valueStr = shorthand.slice(0, -1);

  const valueMap: Record<string, Value> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 'jack', 'Q': 'queen', 'K': 'king', 'A': 'ace',
  };

  return { value: valueMap[valueStr], suit: suitMap[suitChar] };
}

/**
 * Create a game state directly with full control over hands, discard, and deck.
 * No dealing logic — just sets up the state as specified.
 */
export function createTestState(options: {
  hands: Card[][];
  firstCard: Card;
  remainingDeck?: Card[];
  dealerIndex?: number;
  currentPlayerIndex?: number;
  mode?: 'standard' | 'freestyle';
  pendingEffect?: PendingEffect | null;
  direction?: 1 | -1;
}): GameState {
  const {
    hands,
    firstCard,
    remainingDeck = [],
    dealerIndex = 0,
    mode = 'standard',
    pendingEffect = null,
    direction = 1,
  } = options;

  // Default: first player is right of dealer (next index)
  const currentPlayerIndex = options.currentPlayerIndex ??
    ((dealerIndex + 1) % hands.length);

  const players: Player[] = hands.map((hand, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    hand: [...hand],
    revealedCards: [],
    hasAnnouncedOneCard: false,
  }));

  // Build remaining deck: remove all cards already assigned
  const usedCards = [...hands.flat(), firstCard];
  let deck: Card[];
  if (remainingDeck.length > 0) {
    deck = [...remainingDeck];
  } else {
    deck = createDeck().filter(dc =>
      !usedCards.some(uc => cardEquals(dc, uc))
    );
  }

  return {
    phase: 'playing',
    players,
    currentPlayerIndex,
    direction,
    deck,
    discardPile: [firstCard],
    pendingEffect,
    dealerId: players[dealerIndex].id,
    cardsPerPlayer: Math.max(...hands.map(h => h.length)),
    mode,
    lastAction: null,
    winner: null,
    losers: [],
    finishingCard: null,
  };
}
