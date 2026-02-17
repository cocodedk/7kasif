import { useState, useCallback } from 'react';
import type { ClientMessage } from '@hafte-kasif/shared';

interface WaitingRoomProps {
  roomCode: string;
  players: { id: string; name: string }[];
  isHost: boolean;
  send: (msg: ClientMessage) => void;
}

export function WaitingRoom({ roomCode, players, isHost, send }: WaitingRoomProps) {
  const [cardsPerPlayer, setCardsPerPlayer] = useState(7);
  const [copied, setCopied] = useState(false);

  const canStart = players.length >= 3 && players.length <= 4;

  const handleStart = () => {
    send({ type: 'START_GAME', cardsPerPlayer });
  };

  const handleCopyCode = useCallback(() => {
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [roomCode]);

  return (
    <div className="h-full flex flex-col items-center justify-center px-6">
      <h2 className="text-xl font-bold mb-2">Waiting Room</h2>

      <div
        className="bg-white/10 rounded-xl px-6 py-4 mb-6 cursor-pointer active:bg-white/20 transition-colors"
        onClick={handleCopyCode}
      >
        <p className="text-gray-400 text-xs text-center mb-1">Room Code</p>
        <p className="text-4xl font-mono font-bold tracking-widest text-center">{roomCode}</p>
        <p className="text-gray-400 text-xs text-center mt-1">
          {copied ? 'Copied!' : 'Tap to copy'}
        </p>
      </div>

      <div className="w-full max-w-xs space-y-3 mb-6">
        <p className="text-sm text-gray-400">Players ({players.length}/4):</p>
        {players.map(p => (
          <div key={p.id} className="bg-white/5 rounded-lg px-4 py-2 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span>{p.name}</span>
          </div>
        ))}
        {players.length < 3 && (
          <p className="text-yellow-500 text-xs text-center">
            Need at least {3 - players.length} more player{3 - players.length > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {isHost && (
        <div className="w-full max-w-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Cards per player:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCardsPerPlayer(Math.max(2, cardsPerPlayer - 1))}
                className="w-8 h-8 bg-white/10 rounded-lg active:bg-white/20 text-lg"
              >
                -
              </button>
              <span className="text-xl font-bold w-6 text-center">{cardsPerPlayer}</span>
              <button
                onClick={() => setCardsPerPlayer(Math.min(7, cardsPerPlayer + 1))}
                className="w-8 h-8 bg-white/10 rounded-lg active:bg-white/20 text-lg"
              >
                +
              </button>
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={!canStart}
            className="w-full bg-green-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-3 rounded-lg active:bg-green-700 transition-colors"
          >
            Start Game
          </button>
        </div>
      )}

      {!isHost && (
        <p className="text-gray-400 text-sm">Waiting for host to start...</p>
      )}
    </div>
  );
}
