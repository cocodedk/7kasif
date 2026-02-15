import type { Card as CardType, Suit } from '@hafte-kasif/shared';

const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '\u2665',
  diamonds: '\u2666',
  clubs: '\u2663',
  spades: '\u2660',
};

const SUIT_COLORS: Record<Suit, string> = {
  hearts: 'text-red-600',
  diamonds: 'text-red-600',
  clubs: 'text-gray-800',
  spades: 'text-gray-800',
};

const VALUE_DISPLAY: Record<string, string> = {
  '2': '2', '3': '3', '4': '4', '5': '5', '6': '6',
  '7': '7', '8': '8', '9': '9', '10': '10',
  'jack': 'J', 'queen': 'Q', 'king': 'K', 'ace': 'A',
};

interface CardProps {
  card: CardType;
  selected?: boolean;
  onClick?: () => void;
  small?: boolean;
  revealed?: boolean;
  playable?: boolean;
  isMyTurn?: boolean;
  centered?: boolean;
}

export function Card({ card, selected, onClick, small, revealed, playable, isMyTurn, centered }: CardProps) {
  const valueStr = VALUE_DISPLAY[String(card.value)];
  const suitSymbol = SUIT_SYMBOLS[card.suit];
  const suitColor = SUIT_COLORS[card.suit];

  const dimmed = isMyTurn && playable === false;
  const glowing = isMyTurn && playable === true && !selected;

  return (
    <button
      onClick={dimmed ? undefined : onClick}
      className={`
        relative flex flex-col ${centered ? 'justify-center items-center' : 'justify-between'}
        ${small ? 'w-10 h-14 text-xs' : 'w-14 h-20 text-sm'}
        bg-white rounded-lg border-2 shadow-lg
        ${selected ? 'border-yellow-400 shadow-yellow-400/40' : glowing ? 'border-emerald-400 shadow-emerald-400/30' : 'border-gray-200'}
        ${revealed ? 'ring-2 ring-blue-400' : ''}
        ${onClick && !dimmed ? 'cursor-pointer active:scale-95' : ''}
        ${dimmed ? 'opacity-[0.65]' : ''}
        transition-all duration-150
        p-1 flex-shrink-0
      `}
    >
      <div className={`flex flex-col ${centered ? 'items-center' : 'items-start'} leading-none ${suitColor}`}>
        <span className={`font-extrabold ${small ? 'text-xs' : centered ? 'text-3xl' : 'text-lg'}`}>{valueStr}</span>
        <span className={`${small ? 'text-xs' : centered ? 'text-2xl' : 'text-base'}`}>{suitSymbol}</span>
      </div>
    </button>
  );
}

export function CardBack({ small }: { small?: boolean }) {
  return (
    <div className={`
      ${small ? 'w-10 h-14' : 'w-14 h-20'}
      bg-indigo-700 rounded-lg border-2 border-indigo-400 shadow-lg
      flex items-center justify-center flex-shrink-0 overflow-hidden
    `}>
      <div className={`
        ${small ? 'w-7 h-10' : 'w-10 h-16'}
        border border-indigo-300 rounded
        card-back-pattern
      `} />
    </div>
  );
}
