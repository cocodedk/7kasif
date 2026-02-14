import type { TournamentView } from '@hafte-kasif/shared';
import { Scoreboard } from '../components/Scoreboard.js';

interface SessionEndedScreenProps {
  tournament: TournamentView;
  playerId: string;
  onNewSession: () => void;
}

export function SessionEndedScreen({ tournament, playerId, onNewSession }: SessionEndedScreenProps) {
  // Find the player with highest net score
  const sorted = [...tournament.playerScores].sort((a, b) => b.netScore - a.netScore);
  const champion = sorted[0];
  const isChampion = champion?.playerId === playerId;

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <div className="flex-none text-center pt-8 pb-4 px-6">
        <h2 className="text-2xl font-bold mb-1">Session Complete</h2>
        <p className="text-gray-400 text-sm mb-2">
          {tournament.rounds.length} round{tournament.rounds.length !== 1 ? 's' : ''} played
        </p>
        <p className="text-sm text-gray-500">
          {new Date(tournament.createdAt).toLocaleDateString(undefined, {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })}
        </p>

        {champion && (
          <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-3">
            <div className="text-3xl mb-1">{isChampion ? '👑' : '🏆'}</div>
            <p className="font-bold text-yellow-400">
              {isChampion ? 'You are the champion!' : `${champion.playerName} wins!`}
            </p>
            <p className="text-sm text-yellow-300/70">
              Net score: {champion.netScore > 0 ? '+' : ''}{champion.netScore}
            </p>
          </div>
        )}
      </div>

      <div className="flex-1 px-4 pb-4">
        <Scoreboard tournament={tournament} playerId={playerId} />
      </div>

      <div className="flex-none px-4 pb-6">
        <button
          onClick={onNewSession}
          className="w-full bg-green-600 text-white font-bold py-3 rounded-lg active:bg-green-700"
        >
          New Session
        </button>
      </div>
    </div>
  );
}
