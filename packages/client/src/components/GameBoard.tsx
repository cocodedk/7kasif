import { useEffect, useMemo, useRef, useState } from 'react';
import type { PlayerView, ClientMessage, Card as CardType, Suit } from '@hafte-kasif/shared';
import { isCardPlayable, cardEquals } from '@hafte-kasif/shared';
import { Hand } from './Hand.js';
import { OpponentHand } from './OpponentHand.js';
import { Card, CardBack } from './Card.js';
import { SuitPicker } from './SuitPicker.js';
import { CardGiver } from './CardGiver.js';
import { ChainChoicePicker } from './ChainChoicePicker.js';
import { CardPicker } from './CardPicker.js';

const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663', spades: '\u2660',
};

const VALUE_DISPLAY: Record<string, string> = {
  '2': '2', '3': '3', '4': '4', '5': '5', '6': '6',
  '7': '7', '8': '8', '9': '9', '10': '10',
  'jack': 'J', 'queen': 'Q', 'king': 'K', 'ace': 'A',
};

function formatValue(value: CardType['value']): string {
  return VALUE_DISPLAY[String(value)];
}

interface GameBoardProps {
  game: PlayerView;
  playerId: string;
  error: string | null;
  send: (msg: ClientMessage) => void;
  canPass?: boolean;
  hasDrawn?: boolean;
}

export function GameBoard({ game, playerId, error, send, canPass, hasDrawn }: GameBoardProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showCardPicker, setShowCardPicker] = useState(false);
  const [showSuitPicker, setShowSuitPicker] = useState(false);
  const [showCardGiver, setShowCardGiver] = useState(false);
  const [showChainChoice, setShowChainChoice] = useState(false);
  const [pendingCard, setPendingCard] = useState<CardType | null>(null);

  const isMyTurn = game.currentPlayerId === playerId;
  const selectedCard = selectedIndex !== null ? game.myHand[selectedIndex] : null;

  // Compute next player in turn order
  const allPlayerIds = [playerId, ...game.opponents.map(o => o.id)];
  const currentIdx = allPlayerIds.indexOf(game.currentPlayerId);
  const nextIdx = (currentIdx + game.direction + allPlayerIds.length) % allPlayerIds.length;
  const nextPlayerId = allPlayerIds[nextIdx];

  const playableCards = useMemo(() => {
    const set = new Set<number>();
    game.myHand.forEach((card, i) => {
      if (isCardPlayable(card, game)) set.add(i);
    });
    return set;
  }, [game]);

  // Detect drawn cards by comparing hand between renders
  const [revealCard, setRevealCard] = useState<CardType | null>(null);
  const prevHandRef = useRef<CardType[]>(game.myHand);

  useEffect(() => {
    const prev = prevHandRef.current;
    if (game.myHand.length > prev.length) {
      const newCard = game.myHand.find(
        c => !prev.some(p => cardEquals(p, c))
      );
      if (newCard) {
        setRevealCard(newCard);
        const timer = setTimeout(() => setRevealCard(null), 1500);
        prevHandRef.current = game.myHand;
        return () => clearTimeout(timer);
      }
    }
    prevHandRef.current = game.myHand;
  }, [game.myHand]);

  // Detect played cards by comparing topDiscard between renders
  const [playedCard, setPlayedCard] = useState<{ card: CardType; playerName: string } | null>(null);
  const prevGameRef = useRef<{ topDiscard: CardType | null; currentPlayerId: string }>({
    topDiscard: game.topDiscard,
    currentPlayerId: game.currentPlayerId,
  });

  useEffect(() => {
    const prev = prevGameRef.current;
    const newTop = game.topDiscard;
    if (newTop && (!prev.topDiscard || !cardEquals(prev.topDiscard, newTop))) {
      // Someone played a card — the previous currentPlayerId is who played
      const whoPlayedId = prev.currentPlayerId;
      let playerName: string;
      if (whoPlayedId === playerId) {
        playerName = 'You';
      } else {
        playerName = game.opponents.find(o => o.id === whoPlayedId)?.name ?? 'Opponent';
      }
      setPlayedCard({ card: newTop, playerName });
      const timer = setTimeout(() => setPlayedCard(null), 1800);
      prevGameRef.current = { topDiscard: newTop, currentPlayerId: game.currentPlayerId };
      return () => clearTimeout(timer);
    }
    prevGameRef.current = { topDiscard: newTop, currentPlayerId: game.currentPlayerId };
  }, [game.topDiscard, game.currentPlayerId, game.opponents, playerId]);

  const handlePlay = () => {
    if (!selectedCard || !isMyTurn) return;

    // Jack: need suit picker
    if (selectedCard.value === 'jack') {
      setPendingCard(selectedCard);
      setShowSuitPicker(true);
      return;
    }

    // 2 with cards remaining: need card giver
    if (selectedCard.value === 2 && game.myHand.length > 1) {
      setPendingCard(selectedCard);
      setShowCardGiver(true);
      return;
    }

    // 8 in chain: need chain choice
    if (
      selectedCard.value === 8 &&
      game.pendingEffect?.type === 'seven-chain'
    ) {
      setPendingCard(selectedCard);
      setShowChainChoice(true);
      return;
    }

    // Normal play
    send({
      type: 'PLAYER_ACTION',
      action: { type: 'PLAY_CARD', card: selectedCard },
    });
    setSelectedIndex(null);
  };

  const handleSuitPicked = (suit: Suit) => {
    if (!pendingCard) return;
    send({
      type: 'PLAYER_ACTION',
      action: { type: 'PLAY_CARD', card: pendingCard, declaredSuit: suit },
    });
    setShowSuitPicker(false);
    setPendingCard(null);
    setSelectedIndex(null);
  };

  const handleCardGiven = (giveCard: CardType) => {
    if (!pendingCard) return;
    send({
      type: 'PLAYER_ACTION',
      action: { type: 'PLAY_CARD', card: pendingCard, giveCard },
    });
    setShowCardGiver(false);
    setPendingCard(null);
    setSelectedIndex(null);
  };

  const handleChainChoice = (choice: 'redirect' | 'add') => {
    if (!pendingCard) return;
    send({
      type: 'PLAYER_ACTION',
      action: { type: 'PLAY_CARD', card: pendingCard, chainChoice: choice },
    });
    setShowChainChoice(false);
    setPendingCard(null);
    setSelectedIndex(null);
  };

  const handleDraw = () => {
    if (!isMyTurn) return;
    send({ type: 'PLAYER_ACTION', action: { type: 'DRAW_CARD' } });
  };

  const handlePass = () => {
    if (!isMyTurn) return;
    send({ type: 'PLAYER_ACTION', action: { type: 'PASS_TURN' } });
  };

  const handleAnnounce = () => {
    send({ type: 'PLAYER_ACTION', action: { type: 'ANNOUNCE_ONE_CARD' } });
  };

  const handleChallenge = (targetId: string) => {
    send({
      type: 'PLAYER_ACTION',
      action: { type: 'CHALLENGE_NO_ANNOUNCEMENT', targetPlayerId: targetId },
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Opponents */}
      <div className="flex-none p-2 space-y-1">
        {game.opponents.map(opp => (
          <div key={opp.id} className="flex items-center gap-2">
            <div className="flex-1">
              <OpponentHand
                opponent={opp}
                isCurrentTurn={game.currentPlayerId === opp.id}
                isNext={nextPlayerId === opp.id}
              />
            </div>
            {opp.cardCount === 1 && !opp.hasAnnouncedOneCard && (
              <button
                onClick={() => handleChallenge(opp.id)}
                className="text-[10px] bg-red-600 px-2 py-1 rounded active:bg-red-700"
              >
                Challenge!
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Center: Discard + Deck + Status */}
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <div className="flex items-center gap-6">
          {/* Draw pile */}
          <div className="relative" onClick={isMyTurn ? handleDraw : undefined}>
            <CardBack />
            <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-gray-400">
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
          {game.pendingEffect?.type === 'ace-chain' && (
            <div className="text-purple-400">
              Ace chain — play or draw
            </div>
          )}
          <div className={isMyTurn ? 'text-green-400 font-bold' : 'text-gray-500'}>
            {isMyTurn ? 'Your turn' : `Waiting for ${game.opponents.find(o => o.id === game.currentPlayerId)?.name ?? '...'}...`}
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

      {/* My Hand */}
      <div className="flex-none pb-safe">
        <div onClick={game.myHand.length > 10 && isMyTurn ? () => setShowCardPicker(true) : undefined}>
          <Hand
            cards={game.myHand}
            selectedIndex={selectedIndex}
            onSelect={game.myHand.length > 10 ? undefined : setSelectedIndex}
            playableCards={playableCards}
            isMyTurn={isMyTurn}
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 px-4 pb-3 pt-1 relative z-50">
          <button
            onClick={handlePlay}
            disabled={!isMyTurn || selectedIndex === null}
            className="flex-1 bg-green-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-2.5 rounded-lg active:bg-green-700 transition-colors"
          >
            Play
          </button>
          <button
            onClick={handleDraw}
            disabled={!isMyTurn || hasDrawn === true}
            className="flex-1 bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-2.5 rounded-lg active:bg-blue-700 transition-colors"
          >
            Draw
          </button>
          <button
            onClick={handlePass}
            disabled={!isMyTurn || canPass === false}
            className="flex-1 bg-gray-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-2.5 rounded-lg active:bg-gray-700 transition-colors"
          >
            Pass
          </button>
          {game.myHand.length === 1 && (
            <button
              onClick={handleAnnounce}
              className="bg-yellow-500 text-black font-bold px-3 py-2.5 rounded-lg active:bg-yellow-600 animate-pulse"
            >
              1!
            </button>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCardPicker && (
        <CardPicker
          cards={game.myHand}
          playableCards={playableCards}
          isMyTurn={isMyTurn}
          onSelect={setSelectedIndex}
          onClose={() => setShowCardPicker(false)}
        />
      )}
      {showSuitPicker && (
        <SuitPicker
          onPick={handleSuitPicked}
          onCancel={() => { setShowSuitPicker(false); setPendingCard(null); }}
        />
      )}
      {showCardGiver && pendingCard && (
        <CardGiver
          cards={game.myHand}
          playedCard={pendingCard}
          onPick={handleCardGiven}
          onCancel={() => { setShowCardGiver(false); setPendingCard(null); }}
        />
      )}
      {showChainChoice && game.pendingEffect?.type === 'seven-chain' && (
        <ChainChoicePicker
          penalty={game.pendingEffect.penalty}
          onChoice={handleChainChoice}
          onCancel={() => { setShowChainChoice(false); setPendingCard(null); }}
        />
      )}

      {/* Played card reveal */}
      {playedCard && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] pointer-events-none">
          <div className="animate-play-reveal flex flex-col items-center gap-3">
            <div className="text-white font-bold text-lg drop-shadow-lg">
              {playedCard.playerName} played
            </div>
            <div className={`w-28 h-40 bg-white rounded-xl border-4 shadow-2xl flex flex-col justify-between p-2 ${
              playedCard.playerName === 'You' ? 'border-green-400 shadow-green-400/30' : 'border-blue-400 shadow-blue-400/30'
            }`}>
              <div className={`flex flex-col items-start leading-none ${playedCard.card.suit === 'hearts' || playedCard.card.suit === 'diamonds' ? 'text-red-500' : 'text-black'}`}>
                <span className="font-bold text-lg">{formatValue(playedCard.card.value)}</span>
                <span className="text-base">{SUIT_SYMBOLS[playedCard.card.suit]}</span>
              </div>
              <div className={`flex flex-col items-end leading-none rotate-180 ${playedCard.card.suit === 'hearts' || playedCard.card.suit === 'diamonds' ? 'text-red-500' : 'text-black'}`}>
                <span className="font-bold text-lg">{formatValue(playedCard.card.value)}</span>
                <span className="text-base">{SUIT_SYMBOLS[playedCard.card.suit]}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drawn card reveal */}
      {revealCard && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] pointer-events-none">
          <div className="animate-draw-reveal">
            <div className="w-28 h-40 bg-white rounded-xl border-4 border-yellow-400 shadow-2xl shadow-yellow-400/30 flex flex-col justify-between p-2">
              <div className={`flex flex-col items-start leading-none ${revealCard.suit === 'hearts' || revealCard.suit === 'diamonds' ? 'text-red-500' : 'text-black'}`}>
                <span className="font-bold text-lg">{formatValue(revealCard.value)}</span>
                <span className="text-base">{SUIT_SYMBOLS[revealCard.suit]}</span>
              </div>
              <div className={`flex flex-col items-end leading-none rotate-180 ${revealCard.suit === 'hearts' || revealCard.suit === 'diamonds' ? 'text-red-500' : 'text-black'}`}>
                <span className="font-bold text-lg">{formatValue(revealCard.value)}</span>
                <span className="text-base">{SUIT_SYMBOLS[revealCard.suit]}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
