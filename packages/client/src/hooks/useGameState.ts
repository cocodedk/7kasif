import { useCallback, useEffect, useReducer } from 'react';
import type { ServerMessage, PlayerView, TournamentView, GameEvent, PlayerHandSummary } from '@hafte-kasif/shared';

interface LobbyState {
  screen: 'home' | 'waiting';
  roomCode: string | null;
  playerId: string | null;
  players: { id: string; name: string }[];
}

interface GameOverInfo {
  winnerId: string;
  loserId: string;
  points: number;
  reversed: boolean;
  hands: PlayerHandSummary[];
}

interface AppState {
  lobby: LobbyState;
  game: PlayerView | null;
  lastEvents: GameEvent[];
  gameOver: GameOverInfo | null;
  tournament: TournamentView | null;
  sessionEnded: boolean;
  error: string | null;
}

type AppAction =
  | { type: 'ROOM_CREATED'; roomCode: string; playerId: string }
  | { type: 'ROOM_JOINED'; playerId: string; players: { id: string; name: string }[] }
  | { type: 'GAME_STATE'; state: PlayerView; events: GameEvent[] }
  | { type: 'GAME_OVER'; info: GameOverInfo }
  | { type: 'TOURNAMENT_UPDATE'; tournament: TournamentView }
  | { type: 'SESSION_ENDED'; tournament: TournamentView }
  | { type: 'ERROR'; reason: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'CLEAR_GAME_OVER' }
  | { type: 'RESET' };

const initialState: AppState = {
  lobby: { screen: 'home', roomCode: null, playerId: null, players: [] },
  game: null,
  lastEvents: [],
  gameOver: null,
  tournament: null,
  sessionEnded: false,
  error: null,
};

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ROOM_CREATED':
      return {
        ...state,
        lobby: {
          screen: 'waiting',
          roomCode: action.roomCode,
          playerId: action.playerId,
          players: [],
        },
        error: null,
      };
    case 'ROOM_JOINED':
      return {
        ...state,
        lobby: {
          ...state.lobby,
          screen: 'waiting',
          playerId: state.lobby.playerId || action.playerId,
          players: action.players,
        },
        error: null,
      };
    case 'GAME_STATE':
      return { ...state, game: action.state, lastEvents: action.events, gameOver: null, error: null };
    case 'GAME_OVER':
      return { ...state, gameOver: action.info };
    case 'TOURNAMENT_UPDATE':
      return { ...state, tournament: action.tournament };
    case 'SESSION_ENDED':
      return { ...state, tournament: action.tournament, sessionEnded: true };
    case 'ERROR':
      return { ...state, error: action.reason };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'CLEAR_GAME_OVER':
      return { ...state, gameOver: null, game: null };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export function useGameState(onMessage: (cb: (msg: ServerMessage) => void) => void) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const handleMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case 'ROOM_CREATED':
        dispatch({ type: 'ROOM_CREATED', roomCode: msg.roomCode, playerId: msg.playerId });
        break;
      case 'ROOM_JOINED':
        dispatch({ type: 'ROOM_JOINED', playerId: msg.playerId, players: msg.players });
        break;
      case 'GAME_STATE':
        dispatch({ type: 'GAME_STATE', state: msg.state, events: msg.events ?? [] });
        break;
      case 'GAME_OVER':
        dispatch({
          type: 'GAME_OVER',
          info: {
            winnerId: msg.winnerId,
            loserId: msg.loserId,
            points: msg.points,
            reversed: msg.reversed,
            hands: msg.hands,
          },
        });
        break;
      case 'TOURNAMENT_UPDATE':
        dispatch({ type: 'TOURNAMENT_UPDATE', tournament: msg.tournament });
        break;
      case 'SESSION_ENDED':
        dispatch({ type: 'SESSION_ENDED', tournament: msg.tournament });
        break;
      case 'MOVE_REJECTED':
        dispatch({ type: 'ERROR', reason: msg.reason });
        break;
    }
  }, []);

  useEffect(() => {
    onMessage(handleMessage);
  }, [onMessage, handleMessage]);

  return { state, dispatch };
}
