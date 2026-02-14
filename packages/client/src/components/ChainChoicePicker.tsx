interface ChainChoicePickerProps {
  penalty: number;
  onChoice: (choice: 'redirect' | 'add') => void;
  onCancel: () => void;
}

export function ChainChoicePicker({ penalty, onChoice, onCancel }: ChainChoicePickerProps) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-felt-light rounded-xl p-6 mx-4">
        <h3 className="text-center text-lg font-bold mb-4">Playing 8 in chain</h3>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => onChoice('redirect')}
            className="bg-blue-600 text-white rounded-lg px-4 py-3 active:bg-blue-700"
          >
            Redirect {penalty} cards to player 2 ahead
          </button>
          <button
            onClick={() => onChoice('add')}
            className="bg-orange-600 text-white rounded-lg px-4 py-3 active:bg-orange-700"
          >
            Add 3 (total: {penalty + 3} cards)
          </button>
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
