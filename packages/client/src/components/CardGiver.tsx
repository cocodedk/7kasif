import type { Card as CardType } from '@hafte-kasif/shared';
import { Card } from './Card.js';

interface CardGiverProps {
  cards: CardType[];
  playedCard: CardType;
  onPick: (card: CardType) => void;
  onCancel: () => void;
}

export function CardGiver({ cards, playedCard, onPick, onCancel }: CardGiverProps) {
  const giveableCards = cards.filter(
    c => !(c.suit === playedCard.suit && c.value === playedCard.value)
  );

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-felt-light rounded-xl p-6 mx-4 max-w-sm">
        <h3 className="text-center text-lg font-bold mb-4">Give a card to next player</h3>
        <div className="flex flex-wrap gap-2 justify-center">
          {giveableCards.map((card, i) => (
            <Card key={i} card={card} onClick={() => onPick(card)} />
          ))}
        </div>
        <button
          onClick={onCancel}
          className="mt-3 w-full text-sm text-gray-400 py-2"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
