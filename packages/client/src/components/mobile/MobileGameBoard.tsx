import type { Card as CardType } from '@hafte-kasif/shared';
import { Card, CardBack } from '../Card.js';
import { MobileHand } from './MobileHand.js';
import { MobileOpponentHand } from './MobileOpponentHand.js';
import { GameModals } from '../GameModals.js';
import { useGameBoard, SUIT_SYMBOLS, type GameBoardProps, type FeedEntry } from '../../hooks/useGameBoard.js';
import { useIsLandscape } from '../../hooks/useIsLandscape.js';
import { useFullscreen } from '../../hooks/useFullscreen.js';

function EventFeed({ feed, compact }: { feed: FeedEntry[]; compact?: boolean }) {
  if (feed.length === 0) return null;
  return (
    <div className={`flex flex-col ${compact ? 'w-28' : 'w-36'} border-l border-gray-700 p-2 gap-1 overflow-y-auto`}>
      <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide mb-0.5">Activity</div>
      {feed.map(entry => (
        <div key={entry.id} className="flex items-start gap-1.5">
          <span className="text-[10px] text-white font-mono shrink-0">{entry.seq}</span>
          <span className={`text-[11px] ${entry.color} leading-tight`}>{entry.text}</span>
        </div>
      ))}
    </div>
  );
}

export function MobileGameBoard(props: GameBoardProps) {
  const { game, playerId, error } = props;
  const gb = useGameBoard(props);
  const isLandscape = useIsLandscape();
  const { isFullscreen, toggle: toggleFullscreen, isSupported: fullscreenSupported } = useFullscreen();

  const fullscreenBtn = fullscreenSupported && !isFullscreen ? (
    <button
      onClick={toggleFullscreen}
      className="fixed top-2 right-2 z-[70] bg-gray-800/80 text-gray-300 rounded-lg px-2 py-1 text-xs backdrop-blur-sm active:bg-gray-700"
    >
      Fullscreen
    </button>
  ) : null;

  const setPendingCardNull = () => {
    // handled via the hook's internal state; we just close the modals
  };

  const gameCenter = (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 min-h-0 overflow-hidden">
      <div className="flex items-center gap-6">
        <div className="relative" onClick={gb.isMyTurn ? gb.handleDraw : undefined}>
          <CardBack />
          <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-gray-400">
            {game.deckCount}
          </span>
        </div>

        {game.topDiscard && (
          <div className="relative">
            <Card card={game.topDiscard} centered />
          </div>
        )}
      </div>

      <div className="text-center text-sm space-y-1">
        {game.declaredSuit && (
          <div className="text-yellow-400">
            House: <span className={game.declaredSuit === 'hearts' || game.declaredSuit === 'diamonds' ? 'text-red-400' : ''}>
              {SUIT_SYMBOLS[game.declaredSuit]} {game.declaredSuit}
            </span>
          </div>
        )}
        {game.pendingEffect?.type === 'seven-chain' && (
          <div className="text-orange-400">
            Chain: {game.pendingEffect.penalty} cards pending!
          </div>
        )}
        {game.pendingEffect?.type === 'seven-penalty' && (
          <div className="text-orange-400">
            {game.pendingEffect.drawn < game.pendingEffect.penalty
              ? `Draw ${game.pendingEffect.drawn}/${game.pendingEffect.penalty}`
              : `Draw ${game.pendingEffect.drawn}/${game.pendingEffect.penalty} — play, draw, or pass`}
          </div>
        )}
        {game.pendingEffect?.type === 'ace-chain' && (
          <div className="text-purple-400">
            Ace chain — play or draw
          </div>
        )}
        {gb.isQueenReveal && (
          <div className="text-pink-400 font-bold animate-pulse">
            Choose a card to reveal!
          </div>
        )}
        <div className={gb.isMyTurn ? 'text-green-400 font-bold' : 'text-gray-500'}>
          {gb.isMyTurn ? 'Your turn' : `Waiting for ${game.opponents.find(o => o.id === game.currentPlayerId)?.name ?? '...'}...`}
        </div>
        {game.direction === -1 && (
          <div className="text-xs text-gray-500">Direction: Counter-clockwise</div>
        )}
      </div>

      {error && (
        <div className="bg-red-900/50 text-red-300 text-xs px-3 py-1 rounded">
          {error}
        </div>
      )}
    </div>
  );

  const revealedCards = game.myRevealedCards && game.myRevealedCards.length > 0 ? (
    <div className="flex-none flex items-center justify-center gap-1 px-4 py-1">
      <span className="text-[10px] text-blue-400 mr-1">Revealed:</span>
      {game.myRevealedCards.map((card, i) => (
        <Card key={`${card.value}-${card.suit}-${i}`} card={card} small revealed />
      ))}
    </div>
  ) : null;

  const handSection = (
    <div className="flex-none pb-safe">
      <div onClick={game.myHand.length > 10 && gb.isMyTurn ? () => gb.setShowCardPicker(true) : undefined}>
        <MobileHand
          cards={game.myHand}
          selectedIndex={gb.selectedIndex}
          onSelect={game.myHand.length > 10 ? undefined : gb.setSelectedIndex}
          revealedCards={game.myRevealedCards}
          playableCards={gb.playableCards}
          isMyTurn={gb.isMyTurn}
        />
      </div>

      <div className="flex gap-2 px-4 pb-3 pt-1 relative z-50">
        {!gb.isQueenReveal && (
          <button
            onClick={gb.handleDraw}
            disabled={!gb.isMyTurn || (game.pendingEffect?.type === 'seven-penalty' ? game.pendingEffect.drawn > game.pendingEffect.penalty : game.hasDrawnThisTurn)}
            className={`flex-1 ${game.hasDrawnThisTurn && !game.pendingEffect ? 'bg-gray-500' : 'bg-blue-600 active:bg-blue-700'} disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-2.5 rounded-lg transition-colors`}
          >
            Draw
          </button>
        )}
        <button
          onClick={gb.handlePlay}
          disabled={!gb.isMyTurn || gb.selectedIndex === null || (!gb.isQueenReveal && game.pendingEffect?.type === 'seven-penalty' && game.pendingEffect.drawn < game.pendingEffect.penalty)}
          className={`flex-1 ${gb.isQueenReveal ? 'bg-pink-600 active:bg-pink-700' : 'bg-green-600 active:bg-green-700'} disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-2.5 rounded-lg transition-colors`}
        >
          {gb.isQueenReveal ? 'Reveal' : 'Play'}
        </button>
        {!gb.isQueenReveal && (
          <button
            onClick={gb.handlePass}
            disabled={!gb.isMyTurn || (!game.hasDrawnThisTurn && !game.pendingEffect) || (game.pendingEffect?.type === 'seven-chain') || (game.pendingEffect?.type === 'ace-chain') || (game.pendingEffect?.type === 'seven-penalty' && game.pendingEffect.drawn < game.pendingEffect.penalty)}
            className={`flex-1 ${game.hasDrawnThisTurn ? 'bg-orange-600 active:bg-orange-700' : 'bg-gray-600 active:bg-gray-700'} disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-2.5 rounded-lg transition-colors`}
          >
            Pass
          </button>
        )}
        {game.myHand.length === 1 && (
          <button
            onClick={gb.handleAnnounce}
            className="bg-yellow-500 text-black font-bold px-3 py-2.5 rounded-lg active:bg-yellow-600 animate-pulse"
          >
            1!
          </button>
        )}
      </div>
    </div>
  );

  const modals = (
    <GameModals
      game={game}
      showCardPicker={gb.showCardPicker}
      setShowCardPicker={gb.setShowCardPicker}
      playableCards={gb.playableCards}
      isMyTurn={gb.isMyTurn}
      setSelectedIndex={gb.setSelectedIndex}
      showSuitPicker={gb.showSuitPicker}
      setShowSuitPicker={gb.setShowSuitPicker}
      handleSuitPicked={gb.handleSuitPicked}
      pendingCard={gb.pendingCard}
      setPendingCardNull={setPendingCardNull}
      showCardGiver={gb.showCardGiver}
      setShowCardGiver={gb.setShowCardGiver}
      handleCardGiven={gb.handleCardGiven}
      showChainChoice={gb.showChainChoice}
      setShowChainChoice={gb.setShowChainChoice}
      handleChainChoice={gb.handleChainChoice}
      playedCard={gb.playedCard}
      revealCard={gb.revealCard}
      fullscreenBtn={fullscreenBtn}
    />
  );

  // Landscape layout: opponents on sides
  if (isLandscape) {
    const opponents = game.opponents;
    const leftOpp = opponents.length >= 2 ? opponents[0] : null;
    const topOpp = opponents.length === 3 ? opponents[1] : opponents.length === 1 ? opponents[0] : null;
    const rightOpp = opponents.length >= 2 ? opponents[opponents.length - 1] : null;

    return (
      <div className="h-full flex flex-col">
        {topOpp && (
          <div className="flex-none flex justify-center p-1">
            <MobileOpponentHand
              opponent={topOpp}
              isCurrentTurn={game.currentPlayerId === topOpp.id}
              isNext={gb.nextPlayerId === topOpp.id}
              onChallenge={() => gb.handleChallenge(topOpp.id)}
              compact
            />
          </div>
        )}

        <div className="flex-1 flex flex-row min-h-0">
          {leftOpp && (
            <div className="flex-none flex items-center p-1">
              <MobileOpponentHand
                opponent={leftOpp}
                isCurrentTurn={game.currentPlayerId === leftOpp.id}
                isNext={gb.nextPlayerId === leftOpp.id}
                onChallenge={() => gb.handleChallenge(leftOpp.id)}
                vertical
              />
            </div>
          )}

          <div className="flex-1 flex flex-row min-h-0">
            <div className="flex-1 flex flex-col min-h-0">
              {gameCenter}
              {revealedCards}
              {handSection}
            </div>
            <EventFeed feed={gb.feed} compact />
          </div>

          {rightOpp && (
            <div className="flex-none flex items-center p-1">
              <MobileOpponentHand
                opponent={rightOpp}
                isCurrentTurn={game.currentPlayerId === rightOpp.id}
                isNext={gb.nextPlayerId === rightOpp.id}
                onChallenge={() => gb.handleChallenge(rightOpp.id)}
                vertical
              />
            </div>
          )}
        </div>
        {modals}
      </div>
    );
  }

  // Portrait layout
  return (
    <div className="h-full flex flex-col">
      <div className="flex-none p-2 flex gap-2 justify-center">
        {game.opponents.map(opp => (
          <MobileOpponentHand
            key={opp.id}
            opponent={opp}
            isCurrentTurn={game.currentPlayerId === opp.id}
            isNext={gb.nextPlayerId === opp.id}
            onChallenge={() => gb.handleChallenge(opp.id)}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-row min-h-0">
        {gameCenter}
        <EventFeed feed={gb.feed} />
      </div>

      {revealedCards}
      {handSection}
      {modals}
    </div>
  );
}
