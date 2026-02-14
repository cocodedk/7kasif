import { useWebSocket } from './hooks/useWebSocket.js';
import { useGameState } from './hooks/useGameState.js';
import { HomeScreen } from './screens/HomeScreen.js';
import { WaitingRoom } from './screens/WaitingRoom.js';
import { GameOverScreen } from './screens/GameOverScreen.js';
import { SessionEndedScreen } from './screens/SessionEndedScreen.js';
import { GameBoard } from './components/GameBoard.js';

export function App() {
  const { send, connected, onMessage } = useWebSocket();
  const { state, dispatch } = useGameState(onMessage);

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
  return <HomeScreen send={send} connected={connected} />;
}
