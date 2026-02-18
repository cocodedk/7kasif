import type { Card as CardType, Suit, Value } from '@hafte-kasif/shared';
import { Card } from './Card.js';
import { SUIT_SYMBOLS } from '../utils/cardFormat.js';

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

const SUIT_COLORS: Record<Suit, string> = {
  hearts: 'text-red-400', diamonds: 'text-red-400', clubs: 'text-gray-300', spades: 'text-gray-300',
};

interface CardPickerProps {
  cards: CardType[];
  playableCards?: Set<number>;
  isMyTurn?: boolean;
  onSelect: (originalIndex: number) => void;
  onClose: () => void;
}

export function CardPicker({ cards, playableCards, isMyTurn, onSelect, onClose }: CardPickerProps) {
  // Sort and group by suit
  const sorted = cards
    .map((card, originalIndex) => ({ card, originalIndex }))
    .sort((a, b) => {
      return cardSortKey(a.card) - cardSortKey(b.card);
    });

  // Group by suit for visual separation
  const groups: { suit: Suit; cards: typeof sorted }[] = [];
  let currentSuit: Suit | null = null;
  for (const entry of sorted) {
    if (entry.card.suit !== currentSuit) {
      currentSuit = entry.card.suit;
      groups.push({ suit: currentSuit, cards: [] });
    }
    groups[groups.length - 1].cards.push(entry);
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex flex-col" onClick={onClose}>
      <div className="flex-1" />
      <div
        className="bg-felt-light rounded-t-2xl p-4 pb-8 max-h-[75vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-white font-bold text-sm">Select a card</h3>
          <button onClick={onClose} className="text-gray-400 text-sm px-2">Close</button>
        </div>

        {groups.map(group => (
          <div key={group.suit} className="mb-5">
            <div className={`text-xs font-medium mb-1 ${SUIT_COLORS[group.suit]}`}>
              {SUIT_SYMBOLS[group.suit]} {group.suit}
            </div>
            <div className="flex flex-wrap gap-4">
              {group.cards.map(({ card, originalIndex }) => (
                <Card
                  key={`${card.value}-${card.suit}`}
                  card={card}
                  playable={playableCards ? playableCards.has(originalIndex) : undefined}
                  isMyTurn={isMyTurn}
                  onClick={() => {
                    onSelect(originalIndex);
                    onClose();
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
