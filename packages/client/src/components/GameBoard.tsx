import { useEffect, useMemo, useRef, useState } from 'react';
import type { PlayerView, ClientMessage, Card as CardType, Suit, GameEvent } from '@hafte-kasif/shared';
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
  lastEvents?: GameEvent[];
}

interface FeedEntry {
  seq: number; // sequential number for display
  id: number; // unique key
  text: string;
  card?: CardType; // optional card to show
  color: string; // tailwind text color
}

let feedIdCounter = 0;
let feedSeqCounter = 0;

function formatCard(card: CardType): string {
  const VALUE_NAMES: Record<string, string> = {
    '2': '2', '3': '3', '4': '4', '5': '5', '6': '6',
    '7': '7', '8': '8', '9': '9', '10': '10',
    'jack': 'J', 'queen': 'Q', 'king': 'K', 'ace': 'A',
  };
  const SUIT_CHARS: Record<string, string> = {
    hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663', spades: '\u2660',
  };
  return `${VALUE_NAMES[String(card.value)]}${SUIT_CHARS[card.suit]}`;
}

export function GameBoard({ game, playerId, error, send, lastEvents = [] }: GameBoardProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showCardPicker, setShowCardPicker] = useState(false);
  const [showSuitPicker, setShowSuitPicker] = useState(false);
  const [showCardGiver, setShowCardGiver] = useState(false);
  const [showChainChoice, setShowChainChoice] = useState(false);
  const [pendingCard, setPendingCard] = useState<CardType | null>(null);
  const [feed, setFeed] = useState<FeedEntry[]>([]);

  const isMyTurn = game.currentPlayerId === playerId;
  const selectedCard = selectedIndex !== null ? game.myHand[selectedIndex] : null;
  const isQueenReveal = game.pendingEffect?.type === 'queen-reveal' &&
    game.pendingEffect.targetPlayerId === playerId && isMyTurn;

  // Compute next player in turn order
  const allPlayerIds = [playerId, ...game.opponents.map(o => o.id)];
  const currentIdx = allPlayerIds.indexOf(game.currentPlayerId);
  const nextIdx = (currentIdx + game.direction + allPlayerIds.length) % allPlayerIds.length;
  const nextPlayerId = allPlayerIds[nextIdx];

  const playableCards = useMemo(() => {
    const set = new Set<number>();
    if (isQueenReveal) {
      // During queen reveal, cards not already revealed are selectable
      game.myHand.forEach((card, i) => {
        const alreadyRevealed = game.myRevealedCards?.some(
          r => r.suit === card.suit && r.value === card.value,
        );
        if (!alreadyRevealed) set.add(i);
      });
    } else {
      game.myHand.forEach((card, i) => {
        if (isCardPlayable(card, game)) set.add(i);
      });
    }
    return set;
  }, [game, isQueenReveal]);

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

  // Detect played cards for the overlay animation
  const [playedCard, setPlayedCard] = useState<{ card: CardType; playerName: string } | null>(null);
  const playedTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Helper to resolve player name from id
  const playerName = (id: string) =>
    id === playerId ? 'You' : (game.opponents.find(o => o.id === id)?.name ?? 'Opponent');

  // Build feed entries from server events
  useEffect(() => {
    if (lastEvents.length === 0) return;

    const newEntries: FeedEntry[] = [];
    for (const ev of lastEvents) {
      const seq = ++feedSeqCounter;
      switch (ev.type) {
        case 'CARD_PLAYED': {
          const name = playerName(ev.playerId);
          newEntries.push({
            seq, id: ++feedIdCounter,
            text: `${name} played ${formatCard(ev.card)}`,
            card: ev.card,
            color: 'text-green-300',
          });
          // Also trigger the card overlay
          setPlayedCard({ card: ev.card, playerName: name });
          clearTimeout(playedTimerRef.current);
          playedTimerRef.current = setTimeout(() => setPlayedCard(null), 1800);
          break;
        }
        case 'CARD_DRAWN':
          newEntries.push({
            seq, id: ++feedIdCounter,
            text: `${playerName(ev.playerId)} drew ${ev.count} card${ev.count > 1 ? 's' : ''}`,
            color: 'text-blue-300',
          });
          break;
        case 'TURN_PASSED':
          newEntries.push({
            seq, id: ++feedIdCounter,
            text: `${playerName(ev.playerId)} passed`,
            color: 'text-gray-400',
          });
          break;
        case 'CARD_REVEALED':
          newEntries.push({
            seq, id: ++feedIdCounter,
            text: `${playerName(ev.playerId)} revealed ${formatCard(ev.card)}`,
            card: ev.card,
            color: 'text-pink-300',
          });
          break;
        case 'CARD_GIVEN':
          newEntries.push({
            seq, id: ++feedIdCounter,
            text: ev.card
              ? `${playerName(ev.fromPlayerId)} gave ${formatCard(ev.card)} to ${playerName(ev.toPlayerId)}`
              : `${playerName(ev.fromPlayerId)} gave a card to ${playerName(ev.toPlayerId)}`,
            card: ev.card ?? undefined,
            color: 'text-yellow-300',
          });
          break;
        case 'DIRECTION_REVERSED':
          newEntries.push({
            seq, id: ++feedIdCounter,
            text: `Direction reversed`,
            color: 'text-orange-300',
          });
          break;
        case 'PLAYER_SKIPPED':
          newEntries.push({
            seq, id: ++feedIdCounter,
            text: `${playerName(ev.playerId)} was skipped`,
            color: 'text-red-300',
          });
          break;
        case 'CHAIN_REACTION':
          newEntries.push({
            seq, id: ++feedIdCounter,
            text: `${playerName(ev.targetPlayerId)} takes ${ev.penalty} card penalty`,
            color: 'text-orange-400',
          });
          break;
        case 'DECK_RESHUFFLED':
          newEntries.push({
            seq, id: ++feedIdCounter,
            text: 'Deck reshuffled from discard pile',
            color: 'text-amber-400',
          });
          break;
        case 'HOUSE_CHANGED':
          newEntries.push({
            seq, id: ++feedIdCounter,
            text: `House changed to ${ev.newSuit}`,
            color: 'text-yellow-400',
          });
          break;
      }
    }
    if (newEntries.length > 0) {
      setFeed(prev => [...newEntries, ...prev].slice(0, 12));
    }
  }, [lastEvents]);

  const handlePlay = () => {
    if (!selectedCard || !isMyTurn) return;

    // Queen reveal mode: send REVEAL_CARD instead
    if (isQueenReveal) {
      send({
        type: 'PLAYER_ACTION',
        action: { type: 'REVEAL_CARD', card: selectedCard },
      });
      setSelectedIndex(null);
      return;
    }

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
      <div className="flex-none p-2 flex gap-2 justify-center">
        {game.opponents.map(opp => (
          <OpponentHand
            key={opp.id}
            opponent={opp}
            isCurrentTurn={game.currentPlayerId === opp.id}
            isNext={nextPlayerId === opp.id}
            onChallenge={() => handleChallenge(opp.id)}
          />
        ))}
      </div>

      {/* Center row: Game area + sidebar */}
      <div className="flex-1 flex flex-row min-h-0">
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
            {isQueenReveal && (
              <div className="text-pink-400 font-bold animate-pulse">
                Choose a card to reveal!
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

        {/* Event Feed sidebar */}
        {feed.length > 0 && (
          <div className="flex flex-col w-44 md:w-52 border-l border-gray-700 p-2 gap-1 overflow-y-auto">
            <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide mb-0.5">Activity</div>
            {feed.map(entry => (
              <div key={entry.id} className="flex items-start gap-1.5">
                <span className="text-[10px] text-gray-600 font-mono w-4 shrink-0 text-right">{entry.seq}</span>
                {entry.card ? (
                  <div className="shrink-0"><Card card={entry.card} small /></div>
                ) : (
                  <div className="w-[28px] shrink-0" />
                )}
                <span className={`text-[11px] ${entry.color} leading-tight`}>{entry.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Revealed cards (between pile and hand) */}
      {game.myRevealedCards && game.myRevealedCards.length > 0 && (
        <div className="flex-none flex items-center justify-center gap-1 px-4 py-1">
          <span className="text-[10px] text-blue-400 mr-1">Revealed:</span>
          {game.myRevealedCards.map((card, i) => (
            <Card key={`${card.value}-${card.suit}`} card={card} small revealed />
          ))}
        </div>
      )}

      {/* My Hand */}
      <div className="flex-none pb-safe">
        <div onClick={game.myHand.length > 10 && isMyTurn ? () => setShowCardPicker(true) : undefined}>
          <Hand
            cards={game.myHand}
            selectedIndex={selectedIndex}
            onSelect={game.myHand.length > 10 ? undefined : setSelectedIndex}
            revealedCards={game.myRevealedCards}
            playableCards={playableCards}
            isMyTurn={isMyTurn}
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 px-4 pb-3 pt-1 relative z-50">
          <button
            onClick={handlePlay}
            disabled={!isMyTurn || selectedIndex === null || (!isQueenReveal && game.pendingEffect?.type === 'seven-penalty' && game.pendingEffect.drawn < game.pendingEffect.penalty)}
            className={`flex-1 ${isQueenReveal ? 'bg-pink-600 active:bg-pink-700' : 'bg-green-600 active:bg-green-700'} disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-2.5 rounded-lg transition-colors`}
          >
            {isQueenReveal ? 'Reveal' : 'Play'}
          </button>
          {!isQueenReveal && (
            <button
              onClick={handleDraw}
              disabled={!isMyTurn || (game.pendingEffect?.type === 'seven-penalty' ? game.pendingEffect.drawn > game.pendingEffect.penalty : game.hasDrawnThisTurn)}
              className={`flex-1 ${game.hasDrawnThisTurn && !game.pendingEffect ? 'bg-gray-500' : 'bg-blue-600 active:bg-blue-700'} disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-2.5 rounded-lg transition-colors`}
            >
              Draw
            </button>
          )}
          {!isQueenReveal && (
            <button
              onClick={handlePass}
              disabled={!isMyTurn || (!game.hasDrawnThisTurn && !game.pendingEffect) || (game.pendingEffect?.type === 'seven-chain') || (game.pendingEffect?.type === 'ace-chain') || (game.pendingEffect?.type === 'seven-penalty' && game.pendingEffect.drawn < game.pendingEffect.penalty)}
              className={`flex-1 ${game.hasDrawnThisTurn ? 'bg-orange-600 active:bg-orange-700' : 'bg-gray-600 active:bg-gray-700'} disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-2.5 rounded-lg transition-colors`}
            >
              Pass
            </button>
          )}
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
        <div className="fixed inset-0 flex items-center justify-center z-[60] pointer-events-none">
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
        <div className="fixed inset-0 flex items-center justify-center z-[60] pointer-events-none">
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
