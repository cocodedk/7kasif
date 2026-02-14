import type { OpponentView } from '@hafte-kasif/shared';
import { Card, CardBack } from './Card.js';

interface OpponentHandProps {
  opponent: OpponentView;
  isCurrentTurn: boolean;
}

export function OpponentHand({ opponent, isCurrentTurn }: OpponentHandProps) {
  return (
    <div className={`
      flex items-center gap-2 px-3 py-1.5 rounded-lg
      ${isCurrentTurn ? 'bg-yellow-500/20 border border-yellow-500/40' : 'bg-white/5'}
    `}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium truncate">{opponent.name}</span>
          {opponent.hasAnnouncedOneCard && (
            <span className="text-[10px] bg-red-500 text-white px-1 rounded">1!</span>
          )}
        </div>
        <div className="flex gap-0.5 mt-0.5">
          {Array.from({ length: opponent.cardCount }).map((_, i) => (
            <CardBack key={i} small />
          ))}
        </div>
      </div>
      {opponent.revealedCards.length > 0 && (
        <div className="flex gap-1">
          {opponent.revealedCards.map((card, i) => (
            <Card key={i} card={card} small revealed />
          ))}
        </div>
      )}
    </div>
  );
}
