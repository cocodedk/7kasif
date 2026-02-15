import type { OpponentView } from '@hafte-kasif/shared';
import { Card, CardBack } from './Card.js';

interface OpponentHandProps {
  opponent: OpponentView;
  isCurrentTurn: boolean;
  isNext: boolean;
}

export function OpponentHand({ opponent, isCurrentTurn, isNext }: OpponentHandProps) {
  return (
    <div className={`
      flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors duration-300
      ${isCurrentTurn
        ? 'bg-yellow-400/30 border-2 border-yellow-400 shadow-md shadow-yellow-400/20'
        : isNext
          ? 'bg-blue-400/20 border-2 border-blue-400/70 shadow-sm shadow-blue-400/15'
          : 'bg-white/5 border border-transparent'}
    `}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium truncate">{opponent.name}</span>
          {isCurrentTurn && (
            <span className="text-[10px] bg-yellow-400 text-black px-1.5 py-0.5 rounded font-bold animate-pulse">Playing</span>
          )}
          {isNext && !isCurrentTurn && (
            <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded font-bold">Next</span>
          )}
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
