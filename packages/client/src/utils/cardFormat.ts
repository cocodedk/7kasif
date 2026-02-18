import type { Suit, Card } from '@hafte-kasif/shared';

export const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663', spades: '\u2660',
};

export const VALUE_DISPLAY: Record<string, string> = {
  '2': '2', '3': '3', '4': '4', '5': '5', '6': '6',
  '7': '7', '8': '8', '9': '9', '10': '10',
  'jack': 'J', 'queen': 'Q', 'king': 'K', 'ace': 'A',
};

export function formatValue(value: Card['value']): string {
  return VALUE_DISPLAY[String(value)];
}

export function formatCard(card: Card): string {
  return `${VALUE_DISPLAY[String(card.value)]}${SUIT_SYMBOLS[card.suit]}`;
}
