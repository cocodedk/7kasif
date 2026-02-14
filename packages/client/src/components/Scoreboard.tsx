import type { TournamentView, PlayerScore, CellMarker } from '@hafte-kasif/shared';

interface ScoreboardProps {
  tournament: TournamentView;
  playerId: string;
}

function CellDisplay({ marker }: { marker: CellMarker | null }) {
  if (!marker) {
    return <div className="w-7 h-7 border border-white/20 rounded" />;
  }
  return (
    <div className={`
      w-7 h-7 rounded flex items-center justify-center font-bold text-sm
      ${marker === 'I' ? 'bg-green-500/30 text-green-400 border border-green-500/50' : ''}
      ${marker === 'X' ? 'bg-red-500/30 text-red-400 border border-red-500/50' : ''}
    `}>
      {marker}
    </div>
  );
}

function PlayerScoreTable({ score, isMe }: { score: PlayerScore; isMe: boolean }) {
  return (
    <div className={`rounded-lg p-3 ${isMe ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-white/5'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-sm">
          {score.playerName} {isMe && '(you)'}
        </span>
        <span className={`text-sm font-bold ${
          score.netScore > 0 ? 'text-green-400' :
          score.netScore < 0 ? 'text-red-400' : 'text-gray-400'
        }`}>
          {score.netScore > 0 ? '+' : ''}{score.netScore}
        </span>
      </div>
      <div className="space-y-1">
        {score.rows.map((row, i) => {
          const isFull = row.cells.every(c => c !== null);
          const allSame = isFull && row.cells.every(c => c === row.cells[0]);
          return (
            <div key={i} className={`flex gap-1 ${isFull && allSame ? 'opacity-100' : isFull ? 'opacity-40' : ''}`}>
              {row.cells.map((cell, j) => (
                <CellDisplay key={j} marker={cell} />
              ))}
              {isFull && allSame && (
                <span className={`text-xs self-center ml-1 ${
                  row.cells[0] === 'I' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {row.cells[0] === 'I' ? '+1' : '-1'}
                </span>
              )}
              {isFull && !allSame && (
                <span className="text-xs self-center ml-1 text-gray-500">0</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Scoreboard({ tournament, playerId }: ScoreboardProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-400">
          Session Scoreboard
        </h3>
        <span className="text-xs text-gray-500">
          Round {tournament.currentRound}
        </span>
      </div>
      {tournament.playerScores.map(score => (
        <PlayerScoreTable
          key={score.playerId}
          score={score}
          isMe={score.playerId === playerId}
        />
      ))}
    </div>
  );
}
