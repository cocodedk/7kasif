import type { Card as CardType, Suit, Value } from '@hafte-kasif/shared';
import { Card } from '../Card.js';

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

function cardSortKey(card: CardType): number {
  return suitRank(card.suit) * 100 + valueRank(card.value);
}

function sortCards(cards: CardType[]): { card: CardType; originalIndex: number }[] {
  return cards
    .map((card, originalIndex) => ({ card, originalIndex }))
    .sort((a, b) => cardSortKey(a.card) - cardSortKey(b.card));
}

interface DesktopHandProps {
  cards: CardType[];
  selectedIndex: number | null;
  onSelect?: (index: number) => void;
  revealedCards?: CardType[];
  playableCards?: Set<number>;
  isMyTurn?: boolean;
}

const CARD_GAP = 6;
const CARD_WIDTH = 56;

export function DesktopHand({ cards, selectedIndex, onSelect, revealedCards = [], playableCards, isMyTurn }: DesktopHandProps) {
  const isRevealed = (card: CardType) =>
    revealedCards.some(r => r.suit === card.suit && r.value === card.value);

  const sorted = sortCards(cards);

  return (
    <div className="hand-scroll flex overflow-x-auto px-6 py-3 justify-center items-end gap-0">
      {sorted.map(({ card, originalIndex }, i) => {
        const selected = selectedIndex === originalIndex;

        return (
          <div
            key={`${card.value}-${card.suit}`}
            className="flex-shrink-0"
            style={{
              marginLeft: i > 0 ? `${CARD_GAP}px` : 0,
              zIndex: selected ? 50 : i,
              transform: selected ? 'translateY(-14px)' : 'none',
              transition: 'transform 150ms ease',
            }}
          >
            <Card
              card={card}
              selected={selected}
              width={CARD_WIDTH}
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
