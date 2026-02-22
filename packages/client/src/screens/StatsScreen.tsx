import { useState, useEffect, useCallback } from 'react';
import type { TournamentView } from '@hafte-kasif/shared';

interface StatsScreenProps {
  onBack: () => void;
}

type Tab = 'rankings' | 'tournaments';

interface LeaderboardEntry {
  userId: number | null;
  playerName: string;
  displayName: string | null;
  totalSessions: number;
  totalRoundsWon: number;
  totalRoundsLost: number;
  totalPlusClusters: number;
  totalMinusClusters: number;
  netScore: number;
}

interface TournamentSummary {
  id: number;
  sessionCode: string;
  roomCode: string;
  mode: string;
  startedAt: string;
  endedAt: string | null;
  playerCount: number;
  roundCount: number;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2024 }, (_, i) => CURRENT_YEAR - i);

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function RankingsTable({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) {
    return <div className="text-gray-500 text-sm">No data for this year.</div>;
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 text-xs border-b border-white/10">
            <th className="text-left py-2 pr-2">#</th>
            <th className="text-left py-2 pr-2">Player</th>
            <th className="text-right py-2 pr-2">Net</th>
            <th className="text-right py-2 pr-2">+</th>
            <th className="text-right py-2 pr-2">-</th>
            <th className="text-right py-2 pr-2">W</th>
            <th className="text-right py-2 pr-2">L</th>
            <th className="text-right py-2">Games</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => (
            <tr key={`${entry.userId ?? entry.playerName}-${i}`} className="border-b border-white/5">
              <td className="py-2 pr-2 text-gray-500">{i + 1}</td>
              <td className="py-2 pr-2 text-white font-medium">
                {entry.displayName || entry.playerName}
              </td>
              <td className={`py-2 pr-2 text-right font-bold ${
                entry.netScore > 0 ? 'text-green-400' :
                entry.netScore < 0 ? 'text-red-400' : 'text-gray-400'
              }`}>
                {entry.netScore > 0 ? '+' : ''}{entry.netScore}
              </td>
              <td className="py-2 pr-2 text-right text-green-400/70">{entry.totalPlusClusters}</td>
              <td className="py-2 pr-2 text-right text-red-400/70">{entry.totalMinusClusters}</td>
              <td className="py-2 pr-2 text-right text-gray-300">{entry.totalRoundsWon}</td>
              <td className="py-2 pr-2 text-right text-gray-300">{entry.totalRoundsLost}</td>
              <td className="py-2 text-right text-gray-400">{entry.totalSessions}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TournamentDetail({ tournament }: { tournament: TournamentView }) {
  return (
    <div className="space-y-2 mt-2 pl-4 border-l-2 border-white/10">
      {tournament.rounds.length > 0 && (
        <div className="space-y-1">
          {tournament.rounds.map((round) => (
            <div key={round.roundNumber} className="text-xs text-gray-400 flex gap-2">
              <span className="text-gray-500">R{round.roundNumber}</span>
              <span className="text-green-400">{round.winnerId}</span>
              <span className="text-gray-600">beat</span>
              <span className="text-red-400">{round.loserId}</span>
              <span className="text-gray-500">({round.points}pts{round.reversed ? ', reversed' : ''})</span>
            </div>
          ))}
        </div>
      )}
      {tournament.playerScores.length > 0 && (
        <div className="space-y-1 mt-2">
          <div className="text-xs text-gray-500 font-medium">Final scores:</div>
          {[...tournament.playerScores]
            .sort((a, b) => b.netScore - a.netScore)
            .map((score) => (
              <div key={score.playerId} className="text-xs flex gap-2">
                <span className="text-white">{score.playerName}</span>
                <span className={score.netScore > 0 ? 'text-green-400' : score.netScore < 0 ? 'text-red-400' : 'text-gray-400'}>
                  {score.netScore > 0 ? '+' : ''}{score.netScore}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function TournamentsList({ tournaments }: { tournaments: TournamentSummary[] }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<TournamentView | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleExpand = useCallback(async (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(id);
    setDetail(null);
    setLoading(true);
    try {
      const res = await fetch(`${window.location.origin}/api/tournaments/${id}`);
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      setDetail(await res.json());
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [expandedId]);

  if (tournaments.length === 0) {
    return <div className="text-gray-500 text-sm">No tournaments for this year.</div>;
  }

  return (
    <div className="space-y-2 w-full">
      {tournaments.map((t) => (
        <div key={t.id}>
          <button
            onClick={() => toggleExpand(t.id)}
            className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-4 py-3 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-white font-medium">{t.roomCode}</span>
                <span className="text-gray-500 text-xs">{t.mode}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-400 text-xs">{t.playerCount}p · {t.roundCount}r</span>
                <span className="text-gray-500 text-xs">{formatDate(t.startedAt)}</span>
              </div>
            </div>
          </button>
          {expandedId === t.id && (
            <div className="px-4 py-2">
              {loading && <div className="text-gray-500 text-xs">Loading...</div>}
              {detail && <TournamentDetail tournament={detail} />}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function StatsScreen({ onBack }: StatsScreenProps) {
  const [tab, setTab] = useState<Tab>('rankings');
  const [year, setYear] = useState(CURRENT_YEAR);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    const endpoint = tab === 'rankings'
      ? `/api/leaderboard?year=${year}`
      : `/api/tournaments?year=${year}`;

    fetch(`${window.location.origin}${endpoint}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed (${res.status})`);
        const data = await res.json();
        if (tab === 'rankings') {
          setLeaderboard(data);
        } else {
          setTournaments(data);
        }
      })
      .catch((err) => setError(err.message || 'Failed to load data'))
      .finally(() => setLoading(false));
  }, [tab, year]);

  const tabBtn = (t: Tab, label: string) => (
    <button
      onClick={() => setTab(t)}
      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        tab === t ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-gray-200'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="h-full flex flex-col items-center px-6 py-8">
      <h1 className="text-3xl font-bold mb-1">Stats</h1>

      <div className="flex gap-1 mt-2 mb-4">
        {YEARS.map((y) => (
          <button
            key={y}
            onClick={() => setYear(y)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              year === y ? 'bg-white/15 text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-6">
        {tabBtn('rankings', 'Rankings')}
        {tabBtn('tournaments', 'Tournaments')}
      </div>

      {error && (
        <div className="bg-red-900/50 text-red-300 text-sm px-4 py-2 rounded-lg mb-3 w-full max-w-lg">
          {error}
        </div>
      )}

      <div className="w-full max-w-lg">
        {loading ? (
          <div className="text-gray-400 text-sm">Loading...</div>
        ) : tab === 'rankings' ? (
          <RankingsTable entries={leaderboard} />
        ) : (
          <TournamentsList tournaments={tournaments} />
        )}
      </div>

      <button
        type="button"
        onClick={onBack}
        className="mt-6 text-gray-400 py-2 text-sm underline"
      >
        Back
      </button>
    </div>
  );
}
