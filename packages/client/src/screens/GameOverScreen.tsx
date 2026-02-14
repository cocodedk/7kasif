import { useState } from 'react';
import type { ClientMessage, TournamentView } from '@hafte-kasif/shared';
import { Scoreboard } from '../components/Scoreboard.js';

interface GameOverScreenProps {
  winnerId: string;
  loserId: string;
  points: number;
  reversed: boolean;
  playerId: string;
  isHost: boolean;
  tournament: TournamentView | null;
  send: (msg: ClientMessage) => void;
  onReset: () => void;
}

export function GameOverScreen({
  winnerId, loserId, points, reversed, playerId, isHost, tournament, send, onReset,
}: GameOverScreenProps) {
  const [cardsPerPlayer, setCardsPerPlayer] = useState(7);

  const isWinner = reversed ? loserId !== playerId : winnerId === playerId;
  const isLoser = reversed ? winnerId === playerId : loserId === playerId;

  const handleNextRound = () => {
    send({ type: 'NEXT_ROUND', cardsPerPlayer });
  };

  const handleEndSession = () => {
    send({ type: 'END_SESSION' });
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <div className="flex-none text-center pt-6 pb-4 px-6">
        <div className="text-5xl mb-3">
          {isWinner ? '🎉' : isLoser ? '💀' : '🃏'}
        </div>

        <h2 className="text-2xl font-bold mb-1">
          {isWinner ? 'You Win!' : isLoser ? 'Bisheori!' : 'Game Over'}
        </h2>

        {reversed && (
          <div className="bg-purple-500/20 text-purple-300 px-4 py-2 rounded-lg mb-2 text-sm">
            Reversal! Tied losers became winners
          </div>
        )}

        <div className="text-lg mb-4">
          <span className={isWinner ? 'text-green-400' : isLoser ? 'text-red-400' : 'text-gray-400'}>
            {isWinner ? `+${points}` : isLoser ? `-${points}` : '0'} points
          </span>
        </div>
      </div>

      {/* Scoreboard */}
      {tournament && (
        <div className="flex-1 px-4 pb-4">
          <Scoreboard tournament={tournament} playerId={playerId} />
        </div>
      )}

      {/* Actions */}
      <div className="flex-none px-4 pb-6 space-y-3">
        {isHost ? (
          <>
            <div className="flex items-center justify-between px-2">
              <span className="text-sm text-gray-400">Cards next round:</span>
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
              onClick={handleNextRound}
              className="w-full bg-green-600 text-white font-bold py-3 rounded-lg active:bg-green-700"
            >
              Next Round
            </button>
            <button
              onClick={handleEndSession}
              className="w-full bg-gray-600 text-white py-2.5 rounded-lg active:bg-gray-700 text-sm"
            >
              End Session
            </button>
          </>
        ) : (
          <p className="text-center text-gray-400 text-sm">Waiting for host...</p>
        )}
      </div>
    </div>
  );
}
