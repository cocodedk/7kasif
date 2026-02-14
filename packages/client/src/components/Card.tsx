import type { Card as CardType, Suit } from '@hafte-kasif/shared';

const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '\u2665',
  diamonds: '\u2666',
  clubs: '\u2663',
  spades: '\u2660',
};

const SUIT_COLORS: Record<Suit, string> = {
  hearts: 'text-red-500',
  diamonds: 'text-red-500',
  clubs: 'text-gray-900',
  spades: 'text-gray-900',
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
}

export function Card({ card, selected, onClick, small, revealed }: CardProps) {
  const valueStr = VALUE_DISPLAY[String(card.value)];
  const suitSymbol = SUIT_SYMBOLS[card.suit];
  const suitColor = SUIT_COLORS[card.suit];

  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col items-center justify-between
        ${small ? 'w-10 h-14 text-xs' : 'w-14 h-20 text-sm'}
        bg-white rounded-lg border-2 shadow-md
        ${selected ? 'border-yellow-400 -translate-y-2 shadow-yellow-400/30' : 'border-gray-300'}
        ${revealed ? 'ring-2 ring-blue-400' : ''}
        ${onClick ? 'active:scale-95 transition-transform' : ''}
        p-1 flex-shrink-0
      `}
    >
      <span className={`font-bold ${suitColor} ${small ? 'text-[10px]' : 'text-xs'}`}>
        {valueStr}
      </span>
      <span className={`${suitColor} ${small ? 'text-base' : 'text-xl'}`}>
        {suitSymbol}
      </span>
      <span className={`font-bold ${suitColor} ${small ? 'text-[10px]' : 'text-xs'} rotate-180`}>
        {valueStr}
      </span>
    </button>
  );
}

export function CardBack({ small }: { small?: boolean }) {
  return (
    <div className={`
      ${small ? 'w-10 h-14' : 'w-14 h-20'}
      bg-blue-700 rounded-lg border-2 border-blue-500 shadow-md
      flex items-center justify-center flex-shrink-0
    `}>
      <div className={`
        ${small ? 'w-7 h-10' : 'w-10 h-16'}
        border border-blue-400 rounded
        bg-blue-600
      `} />
    </div>
  );
}
