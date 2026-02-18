import type { OpponentView } from '@hafte-kasif/shared';
import { Card, CardBack } from '../Card.js';

interface MobileOpponentHandProps {
  opponent: OpponentView;
  isCurrentTurn: boolean;
  isNext: boolean;
  onChallenge?: () => void;
  vertical?: boolean;
  compact?: boolean;
}

export function MobileOpponentHand({ opponent, isCurrentTurn, isNext, onChallenge, vertical, compact }: MobileOpponentHandProps) {
  const showChallenge = opponent.cardCount === 1 && !opponent.hasAnnouncedOneCard;

  const borderClass = isCurrentTurn
    ? 'bg-yellow-400/30 border-2 border-yellow-400 shadow-md shadow-yellow-400/20'
    : isNext
      ? 'bg-blue-400/20 border-2 border-blue-400/70 shadow-sm shadow-blue-400/15'
      : 'bg-white/5 border border-transparent';

  if (compact) {
    return (
      <div className={`
        flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors duration-300
        ${borderClass}
      `}>
        {opponent.cardCount > 0 && (
          <div className="flex items-center gap-1">
            <CardBack small />
            <span className="text-lg font-bold text-gray-300">&times;{opponent.cardCount}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <span className="text-base font-bold truncate max-w-[120px]">{opponent.name}</span>
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

        {opponent.revealedCards.length > 0 && (
          <div className="flex gap-0.5">
            {opponent.revealedCards.map((card, i) => (
              <Card key={`${card.value}-${card.suit}-${i}`} card={card} small revealed />
            ))}
          </div>
        )}

        {showChallenge && onChallenge && (
          <button
            type="button"
            onClick={onChallenge}
            className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 active:bg-red-700"
          >
            Challenge!
          </button>
        )}
      </div>
    );
  }

  if (vertical) {
    return (
      <div className={`
        flex flex-col items-center gap-1.5 px-1.5 py-2 rounded-lg transition-colors duration-300 w-24
        ${borderClass}
      `}>
        <span className="text-base font-bold truncate max-w-[100px] text-center leading-tight">{opponent.name}</span>

        <div className="flex flex-col items-center gap-0.5">
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

        {opponent.cardCount > 0 && (
          <div className="flex flex-col items-center gap-0.5">
            <CardBack small />
            <span className="text-lg font-bold text-gray-300">&times;{opponent.cardCount}</span>
          </div>
        )}

        {opponent.revealedCards.length > 0 && (
          <div className="flex flex-col gap-0.5 items-center">
            {opponent.revealedCards.map((card, i) => (
              <Card key={`${card.value}-${card.suit}-${i}`} card={card} small revealed />
            ))}
          </div>
        )}

        {showChallenge && onChallenge && (
          <button
            type="button"
            onClick={onChallenge}
            className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 active:bg-red-700"
          >
            Challenge!
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`
      flex flex-col items-center gap-1.5 px-3 py-2 rounded-lg transition-colors duration-300 flex-1 min-w-0
      ${borderClass}
    `}>
      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        <span className="text-base font-bold truncate max-w-[120px]">{opponent.name}</span>
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

      {opponent.cardCount > 0 && (
        <div className="flex items-center gap-1.5">
          <CardBack small />
          <span className="text-lg font-bold text-gray-300">&times;{opponent.cardCount}</span>
        </div>
      )}

      {opponent.revealedCards.length > 0 && (
        <div className="flex gap-0.5 flex-wrap justify-center">
          {opponent.revealedCards.map((card, i) => (
            <Card key={`${card.value}-${card.suit}-${i}`} card={card} small revealed />
          ))}
        </div>
      )}

      {showChallenge && onChallenge && (
        <button
          type="button"
          onClick={onChallenge}
          className="text-xs bg-red-600 text-white px-2.5 py-1 rounded hover:bg-red-700 active:bg-red-700"
        >
          Challenge!
        </button>
      )}
    </div>
  );
}
