import type { PlayerView, ClientMessage, GameEvent } from '@hafte-kasif/shared';
import { useIsMobile } from '../hooks/useIsMobile.js';
import { MobileGameBoard } from './mobile/MobileGameBoard.js';
import { DesktopGameBoard } from './desktop/DesktopGameBoard.js';

interface GameBoardProps {
  game: PlayerView;
  playerId: string;
  error: string | null;
  send: (msg: ClientMessage) => void;
  lastEvents?: GameEvent[];
}

export function GameBoard(props: GameBoardProps) {
  const isMobile = useIsMobile();
  return isMobile ? <MobileGameBoard {...props} /> : <DesktopGameBoard {...props} />;
}
