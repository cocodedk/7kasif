import type { OpponentView } from '@hafte-kasif/shared';
import { Card, CardBack } from '../Card.js';

interface DesktopOpponentHandProps {
  opponent: OpponentView;
  isCurrentTurn: boolean;
  isNext: boolean;
  onChallenge?: () => void;
}

export function DesktopOpponentHand({ opponent, isCurrentTurn, isNext, onChallenge }: DesktopOpponentHandProps) {
  const showChallenge = opponent.cardCount === 1 && !opponent.hasAnnouncedOneCard;

  const borderClass = isCurrentTurn
    ? 'bg-yellow-400/30 border-2 border-yellow-400 shadow-md shadow-yellow-400/20'
    : isNext
      ? 'bg-blue-400/20 border-2 border-blue-400/70 shadow-sm shadow-blue-400/15'
      : 'bg-white/5 border border-transparent';

  return (
    <div className={`
      flex flex-col items-center gap-2 px-4 py-3 rounded-lg transition-colors duration-300 min-w-[140px]
      ${borderClass}
    `}>
      {/* Name + badges */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <span className="text-lg font-bold truncate max-w-[160px]">{opponent.name}</span>
        {isCurrentTurn && (
          <span className="text-xs bg-yellow-400 text-black px-2 py-0.5 rounded font-bold animate-pulse">Playing</span>
        )}
        {isNext && !isCurrentTurn && (
          <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded font-bold">Next</span>
        )}
        {opponent.hasAnnouncedOneCard && (
          <span className="text-xs bg-red-500 text-white px-2 rounded">1!</span>
        )}
      </div>

      {/* Card back + count */}
      {opponent.cardCount > 0 && (
        <div className="flex items-center gap-2">
          <CardBack />
          <span className="text-xl font-bold text-gray-300">&times;{opponent.cardCount}</span>
        </div>
      )}

      {/* Revealed cards */}
      {opponent.revealedCards.length > 0 && (
        <div className="flex gap-1 flex-wrap justify-center">
          {opponent.revealedCards.map((card, i) => (
            <Card key={`${card.value}-${card.suit}-${i}`} card={card} small revealed />
          ))}
        </div>
      )}

      {/* Challenge button */}
      {showChallenge && onChallenge && (
        <button
          type="button"
          onClick={onChallenge}
          className="text-sm bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 active:bg-red-700"
        >
          Challenge!
        </button>
      )}
    </div>
  );
}
