import { useState, useEffect, useCallback, useRef } from 'react';
import type { TournamentView, ScoreHistoryEntry } from '@hafte-kasif/shared';
import { ScoreChart, type DataPoint } from '../components/ScoreChart.js';

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
const YEARS = Array.from({ length: CURRENT_YEAR - 2024 + 1 }, (_, i) => CURRENT_YEAR - i);

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function computeChartData(snapshots: ScoreHistoryEntry[]): DataPoint[] {
  const points: DataPoint[] = [];
  let cumulative = 0;
  let prevSessionId: number | null = null;
  let prevSessionNet = 0;
  for (const snap of snapshots) {
    if (snap.sessionId !== prevSessionId) {
      cumulative += prevSessionNet;
      prevSessionId = snap.sessionId;
    }
    prevSessionNet = snap.netScore;
    points.push({
      x: Date.parse(snap.snapshotAt),
      y: cumulative + snap.netScore,
    });
  }
  return points;
}

function RankingsTable({ entries, onPlayerClick, selectedUserId }: {
  entries: LeaderboardEntry[];
  onPlayerClick: (userId: number) => void;
  selectedUserId: number | null;
}) {
  if (entries.length === 0) {
    return <div className="text-white/70 text-sm">No data for this year.</div>;
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-white/70 text-xs border-b border-white/10">
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
          {entries.map((entry, i) => {
            const clickable = entry.userId !== null;
            const isSelected = entry.userId !== null && entry.userId === selectedUserId;
            return (
              <tr
                key={`${entry.userId ?? entry.playerName}-${i}`}
                className={`border-b border-white/5 ${clickable ? 'cursor-pointer hover:bg-white/5' : ''} ${isSelected ? 'bg-white/10' : ''}`}
                onClick={() => clickable && onPlayerClick(entry.userId!)}
              >
                <td className="py-2 pr-2 text-white/70">{i + 1}</td>
                <td className="py-2 pr-2 text-white font-medium">
                  {entry.displayName || entry.playerName}
                  {clickable && <span className="ml-1 text-white/40 text-xs">&#x25B8;</span>}
                </td>
                <td className={`py-2 pr-2 text-right font-bold ${
                  entry.netScore > 0 ? 'text-green-400' :
                  entry.netScore < 0 ? 'text-red-400' : 'text-white'
                }`}>
                  {entry.netScore > 0 ? '+' : ''}{entry.netScore}
                </td>
                <td className="py-2 pr-2 text-right text-green-400">{entry.totalPlusClusters}</td>
                <td className="py-2 pr-2 text-right text-red-400">{entry.totalMinusClusters}</td>
                <td className="py-2 pr-2 text-right text-white">{entry.totalRoundsWon}</td>
                <td className="py-2 pr-2 text-right text-white">{entry.totalRoundsLost}</td>
                <td className="py-2 text-right text-white">{entry.totalSessions}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TournamentDetail({ tournament }: { tournament: TournamentView }) {
  const playerNames = new Map<string, string>(
    tournament.playerScores.map((s) => [s.playerId, s.playerName])
  );

  return (
    <div className="space-y-2 mt-2 pl-4 border-l-2 border-white/10">
      {tournament.rounds.length > 0 && (
        <div className="space-y-1">
          {tournament.rounds.map((round) => (
            <div key={round.roundNumber} className="text-xs text-white flex gap-2">
              <span className="text-white/70">R{round.roundNumber}</span>
              <span className="text-green-400">{playerNames.get(round.winnerId) ?? round.winnerId}</span>
              <span className="text-white/50">beat</span>
              <span className="text-red-400">{playerNames.get(round.loserId) ?? round.loserId}</span>
              <span className="text-white/70">({round.points}pts{round.reversed ? ', reversed' : ''})</span>
            </div>
          ))}
        </div>
      )}
      {tournament.playerScores.length > 0 && (
        <div className="space-y-1 mt-2">
          <div className="text-xs text-white/70 font-medium">Final scores:</div>
          {[...tournament.playerScores]
            .sort((a, b) => b.netScore - a.netScore)
            .map((score) => (
              <div key={score.playerId} className="text-xs flex gap-2">
                <span className="text-white">{score.playerName}</span>
                <span className={score.netScore > 0 ? 'text-green-400' : score.netScore < 0 ? 'text-red-400' : 'text-white'}>
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
  const abortRef = useRef<AbortController | null>(null);

  const toggleExpand = useCallback(async (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setExpandedId(id);
    setDetail(null);
    setLoading(true);
    try {
      const res = await fetch(`${window.location.origin}/api/tournaments/${id}`, { signal: controller.signal });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const data = await res.json();
      if (!controller.signal.aborted) {
        setDetail(data);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      // silently fail
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [expandedId]);

  if (tournaments.length === 0) {
    return <div className="text-white/70 text-sm">No tournaments for this year.</div>;
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
                <span className="text-white/70 text-xs">{t.mode}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white text-xs">{t.playerCount}p · {t.roundCount}r</span>
                <span className="text-white/70 text-xs">{formatDate(t.startedAt)}</span>
              </div>
            </div>
          </button>
          {expandedId === t.id && (
            <div className="px-4 py-2">
              {loading && <div className="text-white/70 text-xs">Loading...</div>}
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
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [chartData, setChartData] = useState<DataPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartPlayerName, setChartPlayerName] = useState('');
  const chartAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const endpoint = tab === 'rankings'
      ? `/api/leaderboard?year=${year}`
      : `/api/tournaments?year=${year}`;

    fetch(`${window.location.origin}${endpoint}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed (${res.status})`);
        const data = await res.json();
        if (tab === 'rankings') {
          setLeaderboard(data);
        } else {
          setTournaments(data);
        }
      })
      .catch((err) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err.message || 'Failed to load data');
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [tab, year, refreshKey]);

  const handlePlayerClick = useCallback(async (userId: number) => {
    if (selectedUserId === userId) {
      setSelectedUserId(null);
      setChartData([]);
      setChartPlayerName('');
      return;
    }
    chartAbortRef.current?.abort();
    const controller = new AbortController();
    chartAbortRef.current = controller;
    setSelectedUserId(userId);
    setChartData([]);
    setChartLoading(true);

    const entry = leaderboard.find(e => e.userId === userId);
    setChartPlayerName(entry?.displayName || entry?.playerName || '');

    try {
      const res = await fetch(`${window.location.origin}/api/players/${userId}/score-history`, { signal: controller.signal });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const snapshots: ScoreHistoryEntry[] = await res.json();
      if (!controller.signal.aborted) {
        setChartData(computeChartData(snapshots));
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
    } finally {
      if (!controller.signal.aborted) {
        setChartLoading(false);
      }
    }
  }, [selectedUserId, leaderboard]);

  const tabBtn = (t: Tab, label: string) => (
    <button
      onClick={() => setTab(t)}
      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        tab === t ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="h-full flex flex-col items-center px-6 py-8 overflow-y-auto">
      <h1 className="text-3xl font-bold mb-1">Stats</h1>

      <div className="flex gap-1 mt-2 mb-4">
        {YEARS.map((y) => (
          <button
            key={y}
            onClick={() => setYear(y)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              year === y ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-6 items-center">
        {tabBtn('rankings', 'Rankings')}
        {tabBtn('tournaments', 'Tournaments')}
        <button
          onClick={() => setRefreshKey(k => k + 1)}
          disabled={loading}
          className="ml-2 text-white/60 hover:text-white transition-colors disabled:opacity-30"
          title="Refresh"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={loading ? 'animate-spin' : ''}>
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
          </svg>
        </button>
      </div>

      {error && (
        <div className="bg-red-900/50 text-red-300 text-sm px-4 py-2 rounded-lg mb-3 w-full max-w-lg">
          {error}
        </div>
      )}

      <div className="w-full max-w-lg">
        {loading ? (
          <div className="text-white/70 text-sm">Loading...</div>
        ) : tab === 'rankings' ? (
          <>
            <RankingsTable entries={leaderboard} onPlayerClick={handlePlayerClick} selectedUserId={selectedUserId} />
            {selectedUserId !== null && (
              <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="text-sm text-white mb-2 font-medium">
                  Score History &mdash; {chartPlayerName}
                </div>
                {chartLoading ? (
                  <div className="text-white/70 text-xs">Loading chart...</div>
                ) : (
                  <ScoreChart data={chartData} />
                )}
              </div>
            )}
          </>
        ) : (
          <TournamentsList key={year} tournaments={tournaments} />
        )}
      </div>

      <button
        type="button"
        onClick={onBack}
        className="mt-6 text-white/70 py-2 text-sm underline"
      >
        Back
      </button>
    </div>
  );
}
