import type { Card as CardType } from '@hafte-kasif/shared';
import { Card } from './Card.js';

interface HandProps {
  cards: CardType[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  revealedCards?: CardType[];
}

export function Hand({ cards, selectedIndex, onSelect, revealedCards = [] }: HandProps) {
  const isRevealed = (card: CardType) =>
    revealedCards.some(r => r.suit === card.suit && r.value === card.value);

  return (
    <div className="hand-scroll flex gap-2 overflow-x-auto px-4 py-2 justify-center">
      {cards.map((card, i) => (
        <Card
          key={`${card.value}-${card.suit}`}
          card={card}
          selected={selectedIndex === i}
          onClick={() => onSelect(i)}
          revealed={isRevealed(card)}
        />
      ))}
    </div>
  );
}
