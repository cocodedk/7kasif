import { useState, useEffect, useCallback } from 'react';

interface AdminScreenProps {
  token: string;
  onBack: () => void;
}

type Tab = 'rooms' | 'logs' | 'players';

interface LogFile {
  name: string;
  roomCode: string;
  size: number;
  modifiedAt: number;
}

interface LogEntry {
  type: 'INIT' | 'ACTION' | 'GAME_OVER';
  timestamp: number;
  // INIT
  players?: { id: string; name: string }[];
  mode?: string;
  cardsPerPlayer?: number;
  dealerId?: string;
  // ACTION
  playerId?: string;
  action?: { type: string; card?: { suit: string; value: string | number }; declaredSuit?: string; targetPlayerId?: string };
  ok?: boolean;
  reason?: string;
  events?: { type: string; playerId?: string; count?: number; card?: { suit: string; value: string | number }; newSuit?: string; penalty?: number | boolean; targetPlayerId?: string; challengerId?: string }[];
  // GAME_OVER
  winnerId?: string;
  loserId?: string;
  points?: number;
  reversed?: boolean;
}

function formatCard(card: { suit: string; value: string | number }): string {
  const suitSymbol: Record<string, string> = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
  const v = typeof card.value === 'number' ? String(card.value) : card.value.charAt(0).toUpperCase() + card.value.slice(1);
  return `${v}${suitSymbol[card.suit] || card.suit}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString();
}

function formatTimestamp(ms: number, baseMs: number): string {
  const diff = ms - baseMs;
  if (diff < 1000) return '+0s';
  if (diff < 60000) return `+${Math.floor(diff / 1000)}s`;
  return `+${Math.floor(diff / 60000)}m${Math.floor((diff % 60000) / 1000)}s`;
}

// --- Create Player Form (extracted from original) ---

function CreatePlayerForm({ token }: { token: string }) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const trimmedEmail = email.trim();
      const trimmedDisplayName = displayName.trim();
      const res = await fetch(`${window.location.origin}/api/admin/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ email: trimmedEmail, displayName: trimmedDisplayName }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed (${res.status})`);
      }

      setSuccess(`Created player "${displayName}" — login link sent to ${email}`);
      setEmail('');
      setDisplayName('');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
      <input
        type="text"
        value={displayName}
        onChange={e => setDisplayName(e.target.value)}
        placeholder="Display name"
        className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-white/40"
      />
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Email"
        autoComplete="email"
        className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-white/40"
      />
      {error && (
        <div className="bg-red-900/50 text-red-300 text-sm px-4 py-2 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-900/50 text-green-300 text-sm px-4 py-2 rounded-lg">
          {success}
        </div>
      )}
      <button
        type="submit"
        disabled={loading || !email || !displayName}
        className="w-full font-bold py-3 rounded-lg transition-colors disabled:bg-gray-700 text-white bg-green-600 active:bg-green-700"
      >
        {loading ? '...' : 'Create Player'}
      </button>
    </form>
  );
}

// --- Log Detail View ---

function LogDetail({ token, logFile, playerNames, onBack }: { token: string; logFile: LogFile; playerNames: Map<string, string>; onBack: () => void }) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${window.location.origin}/api/admin/logs/${encodeURIComponent(logFile.name)}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Failed (${res.status})`);
        const text = await res.text();
        const parsed = text.trim().split('\n').filter(Boolean).map(line => JSON.parse(line) as LogEntry);
        setEntries(parsed);
      } catch (err: any) {
        setError(err.message || 'Failed to load log');
      } finally {
        setLoading(false);
      }
    })();
  }, [token, logFile.name]);

  const pName = (id?: string) => {
    if (!id) return '?';
    return playerNames.get(id) || id.slice(0, 8);
  };

  const baseTime = entries.length > 0 ? entries[0].timestamp : 0;

  function renderEvent(ev: LogEntry['events'] extends (infer E)[] | undefined ? E : never, idx: number) {
    if (!ev) return null;
    switch (ev.type) {
      case 'CARD_PLAYED': return <span key={idx}>played {ev.card ? formatCard(ev.card) : '?'}</span>;
      case 'CARD_DRAWN': return <span key={idx}>{pName(ev.playerId)} drew {ev.count} card{ev.count !== 1 ? 's' : ''}</span>;
      case 'CARD_GIVEN': return <span key={idx}>card given to {pName(ev.targetPlayerId ?? undefined)}</span>;
      case 'TURN_PASSED': return <span key={idx}>turn passed</span>;
      case 'DIRECTION_REVERSED': return <span key={idx}>direction reversed</span>;
      case 'PLAYER_SKIPPED': return <span key={idx}>{pName(ev.playerId)} skipped</span>;
      case 'CARD_REVEALED': return <span key={idx}>{pName(ev.playerId)} revealed {ev.card ? formatCard(ev.card) : '?'}</span>;
      case 'HOUSE_CHANGED': return <span key={idx}>suit → {ev.newSuit}</span>;
      case 'CHAIN_REACTION': return <span key={idx}>chain! {pName(ev.targetPlayerId)} draws {ev.penalty}</span>;
      case 'DECK_RESHUFFLED': return <span key={idx}>deck reshuffled</span>;
      case 'ONE_CARD_ANNOUNCED': return <span key={idx}>{pName(ev.playerId)} announced one card</span>;
      case 'ANNOUNCEMENT_CHALLENGED': return <span key={idx}>{pName(ev.challengerId)} challenged {pName(ev.targetPlayerId)} {ev.penalty ? '(penalty!)' : '(no penalty)'}</span>;
      default: return <span key={idx}>{ev.type}</span>;
    }
  }

  if (loading) return <div className="text-gray-400">Loading log...</div>;
  if (error) return <div className="text-red-400">{error}</div>;

  return (
    <div className="w-full max-w-lg space-y-2">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-gray-400 hover:text-white text-sm underline">← Back</button>
        <h2 className="text-lg font-bold">{logFile.roomCode}</h2>
        <span className="text-gray-500 text-xs">{formatDate(logFile.modifiedAt)}</span>
      </div>

      <div className="space-y-1.5">
        {entries.map((entry, i) => {
          const ts = <span className="text-gray-600 text-xs mr-2 font-mono">{formatTimestamp(entry.timestamp, baseTime)}</span>;

          if (entry.type === 'INIT') {
            return (
              <div key={i} className="bg-blue-900/30 border border-blue-800/40 rounded px-3 py-2 text-sm">
                {ts}
                <span className="text-blue-300 font-semibold">INIT</span>
                <span className="text-gray-300 ml-2">
                  {entry.players?.map(p => p.name).join(', ')} · {entry.mode} · {entry.cardsPerPlayer} cards · dealer: {pName(entry.dealerId)}
                </span>
              </div>
            );
          }

          if (entry.type === 'ACTION' && entry.ok) {
            const actionDesc = entry.action?.type === 'PLAY_CARD' && entry.action.card
              ? `played ${formatCard(entry.action.card)}`
              : entry.action?.type === 'DECLARE_SUIT'
                ? `declared ${entry.action.declaredSuit}`
                : entry.action?.type.replace(/_/g, ' ').toLowerCase() || '?';

            return (
              <div key={i} className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm">
                {ts}
                <span className="text-green-400 font-medium">{pName(entry.playerId)}</span>
                <span className="text-gray-300 ml-1">{actionDesc}</span>
                {entry.events && entry.events.length > 0 && (
                  <span className="text-gray-500 ml-2 text-xs">
                    → {entry.events.map((ev, j) => renderEvent(ev, j)).reduce<React.ReactNode[]>((acc, el, j) => j === 0 ? [el] : [...acc, ', ', el], [])}
                  </span>
                )}
              </div>
            );
          }

          if (entry.type === 'ACTION' && entry.ok === false) {
            return (
              <div key={i} className="bg-red-900/20 border border-red-900/30 rounded px-3 py-1.5 text-sm opacity-60">
                {ts}
                <span className="text-red-400">{pName(entry.playerId)}</span>
                <span className="text-gray-500 ml-1">{entry.action?.type.replace(/_/g, ' ').toLowerCase()}</span>
                <span className="text-red-400/70 ml-2 text-xs">— {entry.reason}</span>
              </div>
            );
          }

          if (entry.type === 'GAME_OVER') {
            return (
              <div key={i} className="bg-yellow-900/30 border border-yellow-800/40 rounded px-3 py-2 text-sm">
                {ts}
                <span className="text-yellow-300 font-semibold">GAME OVER</span>
                <span className="text-gray-300 ml-2">
                  Winner: {pName(entry.winnerId)} · Loser: {pName(entry.loserId)} · {entry.points} pts
                  {entry.reversed && <span className="ml-1 text-yellow-400 text-xs font-bold">[REVERSED]</span>}
                </span>
              </div>
            );
          }

          return (
            <div key={i} className="text-gray-500 text-xs px-3 py-1">
              {ts}{entry.type}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Active Rooms ---

interface AdminRoom {
  code: string;
  players: { id: string; name: string; connected: boolean }[];
  hostId: string;
  mode: string;
  phase: string;
  createdAt: number;
  lastActivityAt: number;
}

function formatAge(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function ActiveRooms({ token }: { token: string }) {
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stopping, setStopping] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${window.location.origin}/api/admin/rooms`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      setRooms(await res.json());
    } catch (err: any) {
      setError(err.message || 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const stopRoom = async (code: string) => {
    if (!confirm(`Force-stop room ${code}? All players will be disconnected.`)) return;
    setStopping(code);
    setFeedback(null);
    try {
      const res = await fetch(`${window.location.origin}/api/admin/rooms/${code}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      setFeedback({ type: 'ok', msg: `Room ${code} stopped` });
      setRooms(prev => prev.filter(r => r.code !== code));
    } catch (err: any) {
      setFeedback({ type: 'err', msg: err.message || 'Failed to stop room' });
    } finally {
      setStopping(null);
    }
  };

  return (
    <div className="w-full max-w-lg">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-gray-400 text-sm">{rooms.length} active room{rooms.length !== 1 ? 's' : ''}</span>
        <button
          onClick={fetchRooms}
          disabled={loading}
          className="text-gray-400 hover:text-white text-sm underline"
        >
          {loading ? '...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/50 text-red-300 text-sm px-4 py-2 rounded-lg mb-3">{error}</div>
      )}

      {feedback && (
        <div className={`text-sm px-4 py-2 rounded-lg mb-3 ${feedback.type === 'ok' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
          {feedback.msg}
        </div>
      )}

      {!loading && rooms.length === 0 && !error && (
        <div className="text-gray-500 text-sm">No active rooms.</div>
      )}

      <div className="space-y-2">
        {rooms.map(room => (
          <div
            key={room.code}
            className="bg-white/5 border border-white/10 rounded-lg px-4 py-3"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-white font-medium text-lg">{room.code}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${room.phase === 'playing' ? 'bg-green-900/50 text-green-300' : 'bg-gray-700 text-gray-300'}`}>
                  {room.phase}
                </span>
                <span className="text-gray-500 text-xs">{room.mode}</span>
              </div>
              <button
                onClick={() => stopRoom(room.code)}
                disabled={stopping === room.code}
                className="text-xs px-3 py-1 rounded bg-red-700 hover:bg-red-600 text-white font-medium disabled:opacity-50 transition-colors"
              >
                {stopping === room.code ? '...' : 'Stop'}
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mb-1.5">
              {room.players.map(p => (
                <span key={p.id} className="flex items-center gap-1 text-sm">
                  <span className={`inline-block w-2 h-2 rounded-full ${p.connected ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className={p.id === room.hostId ? 'text-white font-medium' : 'text-gray-300'}>
                    {p.name}{p.id === room.hostId ? ' (host)' : ''}
                  </span>
                </span>
              ))}
            </div>

            <div className="text-gray-600 text-xs">
              Created {formatAge(room.createdAt)} · Last activity {formatAge(room.lastActivityAt)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Main AdminScreen ---

export function AdminScreen({ token, onBack }: AdminScreenProps) {
  const [tab, setTab] = useState<Tab>('rooms');
  const [logs, setLogs] = useState<LogFile[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState('');
  const [selectedLog, setSelectedLog] = useState<LogFile | null>(null);
  const [playerNames, setPlayerNames] = useState<Map<string, string>>(new Map());

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    setLogsError('');
    try {
      const res = await fetch(`${window.location.origin}/api/admin/logs`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const data: LogFile[] = await res.json();
      setLogs(data);
    } catch (err: any) {
      setLogsError(err.message || 'Failed to load logs');
    } finally {
      setLogsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // When opening a log detail, parse INIT entry to extract player names
  const openLog = async (log: LogFile) => {
    try {
      const res = await fetch(`${window.location.origin}/api/admin/logs/${encodeURIComponent(log.name)}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const text = await res.text();
      const firstLine = text.split('\n')[0];
      if (firstLine) {
        const entry = JSON.parse(firstLine);
        if (entry.type === 'INIT' && entry.players) {
          const map = new Map<string, string>();
          for (const p of entry.players) map.set(p.id, p.name);
          setPlayerNames(map);
        }
      }
    } catch {
      // proceed without names
    }
    setSelectedLog(log);
  };

  const tabBtn = (t: Tab, label: string) => (
    <button
      onClick={() => { setTab(t); setSelectedLog(null); }}
      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-gray-200'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="h-full flex flex-col items-center px-6 py-8">
      <h1 className="text-3xl font-bold mb-1">Admin</h1>

      <div className="flex gap-2 mb-6 mt-2">
        {tabBtn('rooms', 'Active Rooms')}
        {tabBtn('logs', 'Game Logs')}
        {tabBtn('players', 'Create Player')}
      </div>

      {tab === 'rooms' && <ActiveRooms token={token} />}

      {tab === 'players' && <CreatePlayerForm token={token} />}

      {tab === 'logs' && selectedLog && (
        <LogDetail
          token={token}
          logFile={selectedLog}
          playerNames={playerNames}
          onBack={() => setSelectedLog(null)}
        />
      )}

      {tab === 'logs' && !selectedLog && (
        <div className="w-full max-w-lg">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-gray-400 text-sm">{logs.length} log file{logs.length !== 1 ? 's' : ''}</span>
            <button
              onClick={fetchLogs}
              disabled={logsLoading}
              className="text-gray-400 hover:text-white text-sm underline"
            >
              {logsLoading ? '...' : 'Refresh'}
            </button>
          </div>

          {logsError && (
            <div className="bg-red-900/50 text-red-300 text-sm px-4 py-2 rounded-lg mb-3">
              {logsError}
            </div>
          )}

          {!logsLoading && logs.length === 0 && !logsError && (
            <div className="text-gray-500 text-sm">No game logs found.</div>
          )}

          <div className="space-y-1">
            {logs.map(log => (
              <button
                key={log.name}
                onClick={() => openLog(log)}
                className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-4 py-3 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-white font-medium">{log.roomCode}</span>
                  <span className="text-gray-500 text-xs">{formatBytes(log.size)}</span>
                </div>
                <div className="text-gray-500 text-xs mt-0.5">{formatDate(log.modifiedAt)}</div>
              </button>
            ))}
          </div>
        </div>
      )}

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
