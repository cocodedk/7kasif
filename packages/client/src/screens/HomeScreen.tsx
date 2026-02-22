import { useState } from 'react';
import type { ClientMessage, GameMode } from '@hafte-kasif/shared';

type HomeMessage =
  | Omit<Extract<ClientMessage, { type: 'CREATE_ROOM' }>, 'token'>
  | Omit<Extract<ClientMessage, { type: 'JOIN_ROOM' }>, 'token'>;

interface HomeScreenProps {
  send: (msg: HomeMessage) => void;
  connected: boolean;
}

function getRoomCodeFromHash(): string {
  const hash = window.location.hash.replace('#', '').toUpperCase();
  return /^[A-Z]{4}$/.test(hash) ? hash : '';
}

export function HomeScreen({ send, connected }: HomeScreenProps) {
  const hashCode = getRoomCodeFromHash();
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState(hashCode);
  const [mode, setMode] = useState<GameMode>('standard');
  const [view, setView] = useState<'main' | 'join'>(hashCode ? 'join' : 'main');

  const handleCreate = () => {
    if (!name.trim()) return;
    send({ type: 'CREATE_ROOM', playerName: name.trim(), mode });
  };

  const handleJoin = () => {
    if (!name.trim() || !joinCode.trim()) return;
    send({ type: 'JOIN_ROOM', roomCode: joinCode.trim().toUpperCase(), playerName: name.trim() });
  };

  return (
    <div className="h-full flex flex-col items-center justify-center px-6">
      <h1 className="text-3xl font-bold mb-1">Hafte Kasif</h1>
      <p className="text-gray-400 text-sm mb-8">The Dirty Seven</p>

      {!connected && (
        <div className="bg-red-900/50 text-red-300 text-sm px-4 py-2 rounded-lg mb-4">
          Connecting to server...
        </div>
      )}

      <div className="w-full max-w-xs space-y-4">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name"
          maxLength={20}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-white/40"
        />

        {view === 'main' ? (
          <>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('standard')}
                className={`flex-1 py-2 rounded-lg text-sm border ${
                  mode === 'standard'
                    ? 'border-green-500 bg-green-500/20 text-green-400'
                    : 'border-white/20 text-gray-400'
                }`}
              >
                Standard
              </button>
              <button
                onClick={() => setMode('freestyle')}
                className={`flex-1 py-2 rounded-lg text-sm border ${
                  mode === 'freestyle'
                    ? 'border-purple-500 bg-purple-500/20 text-purple-400'
                    : 'border-white/20 text-gray-400'
                }`}
              >
                Freestyle
              </button>
            </div>

            <button
              onClick={handleCreate}
              disabled={!connected || !name.trim()}
              className="w-full bg-green-600 disabled:bg-gray-700 text-white font-bold py-3 rounded-lg active:bg-green-700 transition-colors"
            >
              Create Room
            </button>
            <button
              onClick={() => setView('join')}
              className="w-full bg-white/10 text-white py-3 rounded-lg active:bg-white/20 transition-colors"
            >
              Join Room
            </button>
          </>
        ) : (
          <>
            <input
              type="text"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Room code (4 letters)"
              maxLength={4}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white text-center text-2xl tracking-widest placeholder-gray-500 focus:outline-none focus:border-white/40 uppercase"
            />
            <button
              onClick={handleJoin}
              disabled={!connected || !name.trim() || joinCode.length !== 4}
              className="w-full bg-blue-600 disabled:bg-gray-700 text-white font-bold py-3 rounded-lg active:bg-blue-700 transition-colors"
            >
              Join
            </button>
            <button
              onClick={() => setView('main')}
              className="w-full text-gray-400 py-2 text-sm"
            >
              Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}
