import type { OpponentView } from '@hafte-kasif/shared';
import { Card, CardBack } from './Card.js';

interface OpponentHandProps {
  opponent: OpponentView;
  isCurrentTurn: boolean;
  isNext: boolean;
  onChallenge?: () => void;
}

export function OpponentHand({ opponent, isCurrentTurn, isNext, onChallenge }: OpponentHandProps) {
  const showChallenge = opponent.cardCount === 1 && !opponent.hasAnnouncedOneCard;

  return (
    <div className={`
      flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-colors duration-300 flex-1 min-w-0
      ${isCurrentTurn
        ? 'bg-yellow-400/30 border-2 border-yellow-400 shadow-md shadow-yellow-400/20'
        : isNext
          ? 'bg-blue-400/20 border-2 border-blue-400/70 shadow-sm shadow-blue-400/15'
          : 'bg-white/5 border border-transparent'}
    `}>
      {/* Name + badges */}
      <div className="flex items-center gap-1 flex-wrap justify-center">
        <span className="text-xs font-medium truncate max-w-[80px]">{opponent.name}</span>
        {isCurrentTurn && (
          <span className="text-[9px] bg-yellow-400 text-black px-1 py-0.5 rounded font-bold animate-pulse">Playing</span>
        )}
        {isNext && !isCurrentTurn && (
          <span className="text-[9px] bg-blue-500 text-white px-1 py-0.5 rounded font-bold">Next</span>
        )}
        {opponent.hasAnnouncedOneCard && (
          <span className="text-[9px] bg-red-500 text-white px-1 rounded">1!</span>
        )}
      </div>

      {/* Single card back + count */}
      {opponent.cardCount > 0 && (
        <div className="flex items-center gap-1">
          <CardBack small />
          <span className="text-sm font-bold text-gray-300">&times;{opponent.cardCount}</span>
        </div>
      )}

      {/* Revealed cards */}
      {opponent.revealedCards.length > 0 && (
        <div className="flex gap-0.5 flex-wrap justify-center">
          {opponent.revealedCards.map((card, i) => (
            <Card key={i} card={card} small revealed />
          ))}
        </div>
      )}

      {/* Challenge button */}
      {showChallenge && onChallenge && (
        <button
          onClick={onChallenge}
          className="text-[10px] bg-red-600 px-2 py-0.5 rounded active:bg-red-700"
        >
          Challenge!
        </button>
      )}
    </div>
  );
}
