import { describe, it, expect } from 'vitest';
import type { Card, Suit, Value } from '@hafte-kasif/shared';

function suitRank(suit: Suit): number {
  if (suit === 'hearts') return 0;
  if (suit === 'diamonds') return 1;
  if (suit === 'clubs') return 2;
  return 3;
}

function valueRank(value: Value): number {
  const n = Number(value);
  if (!isNaN(n)) return n;
  if (value === 'jack') return 11;
  if (value === 'queen') return 12;
  if (value === 'king') return 13;
  return 14;
}

function cardSortKey(card: Card): number {
  return suitRank(card.suit) * 100 + valueRank(card.value);
}

function sortCards(cards: Card[]): { card: Card; originalIndex: number }[] {
  return cards
    .map((card, originalIndex) => ({ card, originalIndex }))
    .sort((a, b) => cardSortKey(a.card) - cardSortKey(b.card));
}

describe('hand card sorting', () => {
  it('sorts 20 cards by suit then value', () => {
    const hand: Card[] = [
      { suit: 'spades', value: 'ace' },
      { suit: 'hearts', value: 10 },
      { suit: 'clubs', value: 3 },
      { suit: 'diamonds', value: 'king' },
      { suit: 'hearts', value: 2 },
      { suit: 'spades', value: 7 },
      { suit: 'clubs', value: 'jack' },
      { suit: 'diamonds', value: 5 },
      { suit: 'hearts', value: 'queen' },
      { suit: 'spades', value: 4 },
      { suit: 'clubs', value: 9 },
      { suit: 'diamonds', value: 'ace' },
      { suit: 'hearts', value: 7 },
      { suit: 'spades', value: 'king' },
      { suit: 'clubs', value: 2 },
      { suit: 'diamonds', value: 8 },
      { suit: 'hearts', value: 'jack' },
      { suit: 'spades', value: 10 },
      { suit: 'clubs', value: 6 },
      { suit: 'diamonds', value: 3 },
    ];

    const sorted = sortCards(hand);
    const result = sorted.map(({ card }) => `${card.value}-${card.suit}`);

    expect(result).toEqual([
      // hearts: 2, 7, 10, jack, queen
      '2-hearts',
      '7-hearts',
      '10-hearts',
      'jack-hearts',
      'queen-hearts',
      // diamonds: 3, 5, 8, king, ace
      '3-diamonds',
      '5-diamonds',
      '8-diamonds',
      'king-diamonds',
      'ace-diamonds',
      // clubs: 2, 3, 6, 9, jack
      '2-clubs',
      '3-clubs',
      '6-clubs',
      '9-clubs',
      'jack-clubs',
      // spades: 4, 7, 10, king, ace
      '4-spades',
      '7-spades',
      '10-spades',
      'king-spades',
      'ace-spades',
    ]);
  });

  it('preserves original indices after sorting', () => {
    const hand: Card[] = [
      { suit: 'spades', value: 'ace' },   // 0
      { suit: 'hearts', value: 2 },        // 1
      { suit: 'clubs', value: 'king' },    // 2
      { suit: 'diamonds', value: 5 },      // 3
    ];

    const sorted = sortCards(hand);
    const indices = sorted.map(({ originalIndex }) => originalIndex);

    // hearts 2 (was index 1), diamonds 5 (was index 3), clubs king (was index 2), spades ace (was index 0)
    expect(indices).toEqual([1, 3, 2, 0]);
  });
});
