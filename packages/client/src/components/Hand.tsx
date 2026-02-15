import type { Card as CardType, Suit, Value } from '@hafte-kasif/shared';
import { Card } from './Card.js';

function suitRank(suit: Suit): number {
  if (suit === 'hearts') return 0;
  if (suit === 'diamonds') return 1;
  if (suit === 'clubs') return 2;
  return 3; // spades
}

function valueRank(value: Value): number {
  const n = Number(value);
  if (!isNaN(n)) return n;
  if (value === 'jack') return 11;
  if (value === 'queen') return 12;
  if (value === 'king') return 13;
  return 14; // ace
}

function cardSortKey(card: CardType): number {
  return suitRank(card.suit) * 100 + valueRank(card.value);
}

function sortCards(cards: CardType[]): { card: CardType; originalIndex: number }[] {
  return cards
    .map((card, originalIndex) => ({ card, originalIndex }))
    .sort((a, b) => cardSortKey(a.card) - cardSortKey(b.card));
}

interface HandProps {
  cards: CardType[];
  selectedIndex: number | null;
  onSelect?: (index: number) => void;
  revealedCards?: CardType[];
  playableCards?: Set<number>;
  isMyTurn?: boolean;
}

export function Hand({ cards, selectedIndex, onSelect, revealedCards = [], playableCards, isMyTurn }: HandProps) {
  const isRevealed = (card: CardType) =>
    revealedCards.some(r => r.suit === card.suit && r.value === card.value);

  const sorted = sortCards(cards);

  // Dynamic overlap: more cards = tighter overlap
  // Card width is 56px (w-14). Show at least 16px of each card.
  const overlapPx = Math.min(40, Math.max(24, Math.floor(40 * sorted.length / 20)));

  return (
    <div className="hand-scroll flex overflow-x-auto px-4 py-2 justify-center items-end">
      {sorted.map(({ card, originalIndex }, i) => {
        const selected = selectedIndex === originalIndex;

        return (
          <div
            key={`${card.value}-${card.suit}`}
            className="flex-shrink-0"
            style={{
              marginLeft: i > 0 ? `-${overlapPx}px` : 0,
              zIndex: selected ? 50 : i,
              transform: selected ? 'translateY(-12px)' : 'none',
              transition: 'transform 150ms ease',
            }}
          >
            <Card
              card={card}
              selected={selected}
              onClick={onSelect ? () => onSelect(originalIndex) : undefined}
              revealed={isRevealed(card)}
              playable={playableCards ? playableCards.has(originalIndex) : undefined}
              isMyTurn={isMyTurn}
            />
          </div>
        );
      })}
    </div>
  );
}
