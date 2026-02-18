import { Card, CardBack } from '../Card.js';
import { DesktopHand } from './DesktopHand.js';
import { DesktopOpponentHand } from './DesktopOpponentHand.js';
import { GameModals } from '../GameModals.js';
import { useGameBoard, SUIT_SYMBOLS, type GameBoardProps } from '../../hooks/useGameBoard.js';
import { EventFeed } from '../EventFeed.js';

export function DesktopGameBoard(props: GameBoardProps) {
  const { game, playerId, error } = props;
  const gb = useGameBoard(props);

  const setPendingCardNull = () => gb.setPendingCard(null);

  const gameCenter = (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 min-h-0 overflow-hidden">
      <div className="flex items-center gap-8">
        {/* Draw pile */}
        <div className="relative cursor-pointer" onClick={gb.isMyTurn ? gb.handleDraw : undefined}>
          <CardBack />
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs text-gray-400">
            {game.deckCount}
          </span>
        </div>

        {/* Discard pile */}
        {game.topDiscard && (
          <div className="relative">
            <Card card={game.topDiscard} centered />
          </div>
        )}
      </div>

      {/* Status line */}
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
        {gb.isJackDeclare && (
          <div className="text-yellow-400 font-bold animate-pulse">
            Choose the house suit!
          </div>
        )}
        <div className={gb.isMyTurn ? 'text-green-400 font-bold' : 'text-gray-500'}>
          {gb.isMyTurn && !gb.isJackDeclare ? 'Your turn' : gb.isJackDeclare ? '' : `Waiting for ${game.opponents.find(o => o.id === game.currentPlayerId)?.name ?? '...'}...`}
        </div>
        {game.direction === -1 && (
          <div className="text-xs text-gray-500">Direction: Counter-clockwise</div>
        )}
      </div>

      {/* Error */}
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
    <div className="flex-none">
      <div onClick={game.myHand.length > 10 && gb.isMyTurn ? () => gb.setShowCardPicker(true) : undefined}>
        <DesktopHand
          cards={game.myHand}
          selectedIndex={gb.selectedIndex}
          onSelect={game.myHand.length > 10 ? undefined : gb.setSelectedIndex}
          revealedCards={game.myRevealedCards}
          playableCards={gb.playableCards}
          isMyTurn={gb.isMyTurn}
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 px-6 pb-4 pt-1 justify-center">
        {!gb.isQueenReveal && (
          <button
            onClick={gb.handleDraw}
            disabled={!gb.isMyTurn || (game.pendingEffect?.type === 'seven-penalty' ? game.pendingEffect.drawn > game.pendingEffect.penalty : game.hasDrawnThisTurn)}
            className={`px-8 ${game.hasDrawnThisTurn && !game.pendingEffect ? 'bg-gray-500' : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700'} disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-2.5 rounded-lg transition-colors`}
          >
            Draw
          </button>
        )}
        <button
          onClick={gb.handlePlay}
          disabled={!gb.isMyTurn || gb.selectedIndex === null || (!gb.isQueenReveal && game.pendingEffect?.type === 'seven-penalty' && game.pendingEffect.drawn < game.pendingEffect.penalty)}
          className={`px-8 ${gb.isQueenReveal ? 'bg-pink-600 hover:bg-pink-500 active:bg-pink-700' : 'bg-green-600 hover:bg-green-500 active:bg-green-700'} disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-2.5 rounded-lg transition-colors`}
        >
          {gb.isQueenReveal ? 'Reveal' : 'Play'}
        </button>
        {!gb.isQueenReveal && (
          <button
            onClick={gb.handlePass}
            disabled={!gb.isMyTurn || (!game.hasDrawnThisTurn && !game.pendingEffect) || (game.pendingEffect?.type === 'seven-chain') || (game.pendingEffect?.type === 'ace-chain') || (game.pendingEffect?.type === 'seven-penalty' && game.pendingEffect.drawn < game.pendingEffect.penalty)}
            className={`px-8 ${game.hasDrawnThisTurn ? 'bg-orange-600 hover:bg-orange-500 active:bg-orange-700' : 'bg-gray-600 hover:bg-gray-500 active:bg-gray-700'} disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-2.5 rounded-lg transition-colors`}
          >
            Pass
          </button>
        )}
        {game.myHand.length === 1 && (
          <button
            onClick={gb.handleAnnounce}
            className="bg-yellow-500 text-black font-bold px-4 py-2.5 rounded-lg hover:bg-yellow-400 active:bg-yellow-600 animate-pulse"
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
      isJackDeclare={gb.isJackDeclare}
    />
  );

  return (
    <div className="h-full flex flex-col">
      {/* Opponents across the top */}
      <div className="flex-none p-3 flex gap-3 justify-center">
        {game.opponents.map(opp => (
          <DesktopOpponentHand
            key={opp.id}
            opponent={opp}
            isCurrentTurn={game.currentPlayerId === opp.id}
            isNext={gb.nextPlayerId === opp.id}
            onChallenge={() => gb.handleChallenge(opp.id)}
          />
        ))}
      </div>

      {/* Center row: Game area + sidebar feed */}
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
