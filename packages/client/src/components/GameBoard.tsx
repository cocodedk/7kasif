import type { GameBoardProps } from '../hooks/useGameBoard.js';
import { useIsMobile } from '../hooks/useIsMobile.js';
import { MobileGameBoard } from './mobile/MobileGameBoard.js';
import { DesktopGameBoard } from './desktop/DesktopGameBoard.js';

export function GameBoard(props: GameBoardProps) {
  const isMobile = useIsMobile();
  return isMobile ? <MobileGameBoard {...props} /> : <DesktopGameBoard {...props} />;
}
