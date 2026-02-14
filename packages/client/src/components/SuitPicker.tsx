import type { Suit } from '@hafte-kasif/shared';

const SUITS: { suit: Suit; symbol: string; color: string }[] = [
  { suit: 'hearts', symbol: '\u2665', color: 'text-red-500' },
  { suit: 'diamonds', symbol: '\u2666', color: 'text-red-500' },
  { suit: 'clubs', symbol: '\u2663', color: 'text-white' },
  { suit: 'spades', symbol: '\u2660', color: 'text-white' },
];

interface SuitPickerProps {
  onPick: (suit: Suit) => void;
  onCancel: () => void;
}

export function SuitPicker({ onPick, onCancel }: SuitPickerProps) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-felt-light rounded-xl p-6 mx-4">
        <h3 className="text-center text-lg font-bold mb-4">Choose new house</h3>
        <div className="grid grid-cols-2 gap-3">
          {SUITS.map(({ suit, symbol, color }) => (
            <button
              key={suit}
              onClick={() => onPick(suit)}
              className={`
                ${color} text-4xl p-4 rounded-lg bg-white/10
                active:bg-white/20 transition-colors
              `}
            >
              {symbol}
            </button>
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
