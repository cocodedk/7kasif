import { useState, useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket.js';
import { useGameState } from './hooks/useGameState.js';
import { useAuth } from './hooks/useAuth.js';
import { LoginScreen } from './screens/LoginScreen.js';
import { HomeScreen } from './screens/HomeScreen.js';
import { WaitingRoom } from './screens/WaitingRoom.js';
import { GameOverScreen } from './screens/GameOverScreen.js';
import { SessionEndedScreen } from './screens/SessionEndedScreen.js';
import { GameBoard } from './components/GameBoard.js';
import { DevPreview } from './DevPreview.js';

const DEV_PREVIEW = import.meta.env.VITE_DEV_PREVIEW === 'true';

export function App() {
  if (DEV_PREVIEW) return <DevPreview />;
  return <GameApp />;
}

function GameApp() {
  const { user, token, isAuthenticated, requestMagicLink, verifyMagicToken, logout } = useAuth();
  const [verifyError, setVerifyError] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Check URL for magic link token on mount
  useEffect(() => {
    const url = new URL(window.location.href);
    const magicToken = url.searchParams.get('token');
    const isVerifyPath = url.pathname === '/auth/verify';

    if (isVerifyPath && magicToken) {
      setVerifying(true);
      verifyMagicToken(magicToken)
        .then(() => {
          // Clean URL
          window.history.replaceState({}, '', '/');
        })
        .catch((err) => {
          setVerifyError(err.message || 'Verification failed');
          window.history.replaceState({}, '', '/');
        })
        .finally(() => setVerifying(false));
    }
  }, [verifyMagicToken]);

  if (verifying) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6">
        <h1 className="text-3xl font-bold mb-1">Hafte Kasif</h1>
        <p className="text-gray-400 text-sm">Verifying login...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginScreen
        onRequestLink={requestMagicLink}
        error={verifyError}
      />
    );
  }

  return (
    <AuthenticatedGame
      token={token}
      displayName={user?.displayName}
      onLogout={logout}
    />
  );
}

function AuthenticatedGame({
  token,
  displayName,
  onLogout,
}: {
  token: string | null;
  displayName?: string;
  onLogout: () => void;
}) {
  const { send: rawSend, connected, onMessage } = useWebSocket();
  const { state, dispatch } = useGameState(onMessage);

  // Wrap send to inject token into CREATE_ROOM and JOIN_ROOM messages
  const send = (msg: Parameters<typeof rawSend>[0]) => {
    if (token && (msg.type === 'CREATE_ROOM' || msg.type === 'JOIN_ROOM')) {
      rawSend({ ...msg, token });
    } else {
      rawSend(msg);
    }
  };

  const playerId = state.lobby.playerId;
  const isHost = state.lobby.players.length > 0 && state.lobby.players[0]?.id === playerId;

  // Session ended
  if (state.sessionEnded && state.tournament && playerId) {
    return (
      <SessionEndedScreen
        tournament={state.tournament}
        playerId={playerId}
        onNewSession={() => dispatch({ type: 'RESET' })}
      />
    );
  }

  // Game Over (between rounds)
  if (state.gameOver && playerId) {
    return (
      <GameOverScreen
        winnerId={state.gameOver.winnerId}
        loserId={state.gameOver.loserId}
        points={state.gameOver.points}
        reversed={state.gameOver.reversed}
        hands={state.gameOver.hands}
        playerId={playerId}
        isHost={isHost}
        tournament={state.tournament}
        send={send}
        onReset={() => dispatch({ type: 'RESET' })}
      />
    );
  }

  // In-game
  if (state.game && state.game.phase === 'playing' && playerId) {
    return (
      <GameBoard
        game={state.game}
        playerId={playerId}
        error={state.error}
        send={send}
        lastEvents={state.lastEvents}
      />
    );
  }

  // Waiting room
  if (state.lobby.screen === 'waiting' && state.lobby.roomCode && playerId) {
    return (
      <WaitingRoom
        roomCode={state.lobby.roomCode}
        players={state.lobby.players}
        isHost={isHost}
        send={send}
      />
    );
  }

  // Home
  return (
    <div className="relative h-full">
      <div className="absolute top-4 right-4 flex items-center gap-3">
        <span className="text-sm text-gray-300">{displayName}</span>
        <button
          onClick={onLogout}
          className="text-xs text-gray-500 hover:text-gray-300"
        >
          Logout
        </button>
      </div>
      <HomeScreen send={send} connected={connected} />
    </div>
  );
}
