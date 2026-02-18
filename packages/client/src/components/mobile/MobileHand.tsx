import { useRef, useState, useEffect } from 'react';
import type { Card as CardType, Suit, Value } from '@hafte-kasif/shared';
import { Card } from '../Card.js';

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

interface MobileHandProps {
  cards: CardType[];
  selectedIndex: number | null;
  onSelect?: (index: number) => void;
  revealedCards?: CardType[];
  playableCards?: Set<number>;
  isMyTurn?: boolean;
}

const CARD_GAP = 4;
const CARD_WIDTH = 44;
const MIN_CARD_WIDTH = 28;
const PADDING = 32;

export function MobileHand({ cards, selectedIndex, onSelect, revealedCards = [], playableCards, isMyTurn }: MobileHandProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isRevealed = (card: CardType) =>
    revealedCards.some(r => r.suit === card.suit && r.value === card.value);

  const sorted = sortCards(cards);
  const count = sorted.length;

  const totalAtFullWidth = count * CARD_WIDTH + (count - 1) * CARD_GAP;
  const availableWidth = containerWidth > 0 ? containerWidth - PADDING : totalAtFullWidth;

  let cardWidth = CARD_WIDTH;
  if (count > 1 && totalAtFullWidth > availableWidth) {
    cardWidth = Math.floor((availableWidth - (count - 1) * CARD_GAP) / count);
    cardWidth = Math.max(cardWidth, MIN_CARD_WIDTH);
  }

  return (
    <div ref={containerRef} className="hand-scroll flex overflow-x-auto px-4 py-2 justify-center items-end">
      {sorted.map(({ card, originalIndex }, i) => {
        const selected = selectedIndex === originalIndex;

        return (
          <div
            key={`${card.value}-${card.suit}`}
            className="flex-shrink-0"
            style={{
              marginLeft: i > 0 ? `${CARD_GAP}px` : 0,
              zIndex: selected ? 50 : i,
              transform: selected ? 'translateY(-12px)' : 'none',
              transition: 'transform 150ms ease',
            }}
          >
            <Card
              card={card}
              selected={selected}
              width={cardWidth}
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
