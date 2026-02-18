import { useEffect, useMemo, useRef, useState } from 'react';
import type { PlayerView, ClientMessage, Card as CardType, Suit, GameEvent } from '@hafte-kasif/shared';
import { isCardPlayable, cardEquals } from '@hafte-kasif/shared';

const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663', spades: '\u2660',
};

const VALUE_DISPLAY: Record<string, string> = {
  '2': '2', '3': '3', '4': '4', '5': '5', '6': '6',
  '7': '7', '8': '8', '9': '9', '10': '10',
  'jack': 'J', 'queen': 'Q', 'king': 'K', 'ace': 'A',
};

export function formatValue(value: CardType['value']): string {
  return VALUE_DISPLAY[String(value)];
}

export function formatCard(card: CardType): string {
  return `${VALUE_DISPLAY[String(card.value)]}${SUIT_SYMBOLS[card.suit]}`;
}

export { SUIT_SYMBOLS, VALUE_DISPLAY };

export interface GameBoardProps {
  game: PlayerView;
  playerId: string;
  error: string | null;
  send: (msg: ClientMessage) => void;
  lastEvents?: GameEvent[];
}

export interface FeedEntry {
  seq: number;
  id: number;
  text: string;
  card?: CardType;
  color: string;
}

export function useGameBoard({ game, playerId, error, send, lastEvents = [] }: GameBoardProps) {
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
  const feedIdCounter = useRef(0);
  const feedSeqCounter = useRef(0);

  useEffect(() => {
    return () => clearTimeout(playedTimerRef.current);
  }, []);

  // Helper to resolve player name from id
  const playerName = (id: string) =>
    id === playerId ? 'You' : (game.opponents.find(o => o.id === id)?.name ?? 'Opponent');

  // Build feed entries from server events
  useEffect(() => {
    if (lastEvents.length === 0) return;

    const playerName = (id: string) =>
      id === playerId ? 'You' : (game.opponents.find(o => o.id === id)?.name ?? 'Opponent');

    const newEntries: FeedEntry[] = [];
    for (const ev of lastEvents) {
      const seq = ++feedSeqCounter.current;
      switch (ev.type) {
        case 'CARD_PLAYED': {
          const name = playerName(ev.playerId);
          newEntries.push({
            seq, id: ++feedIdCounter.current,
            text: `${name} played ${formatCard(ev.card)}`,
            card: ev.card,
            color: 'text-green-300',
          });
          setPlayedCard({ card: ev.card, playerName: name });
          clearTimeout(playedTimerRef.current);
          playedTimerRef.current = setTimeout(() => setPlayedCard(null), 1800);
          break;
        }
        case 'CARD_DRAWN':
          newEntries.push({
            seq, id: ++feedIdCounter.current,
            text: `${playerName(ev.playerId)} drew ${ev.count} card${ev.count > 1 ? 's' : ''}`,
            color: 'text-blue-300',
          });
          break;
        case 'TURN_PASSED':
          newEntries.push({
            seq, id: ++feedIdCounter.current,
            text: `${playerName(ev.playerId)} passed`,
            color: 'text-gray-400',
          });
          break;
        case 'CARD_REVEALED':
          newEntries.push({
            seq, id: ++feedIdCounter.current,
            text: `${playerName(ev.playerId)} revealed ${formatCard(ev.card)}`,
            card: ev.card,
            color: 'text-pink-300',
          });
          break;
        case 'CARD_GIVEN':
          newEntries.push({
            seq, id: ++feedIdCounter.current,
            text: ev.card
              ? `${playerName(ev.fromPlayerId)} gave ${formatCard(ev.card)} to ${playerName(ev.toPlayerId)}`
              : `${playerName(ev.fromPlayerId)} gave a card to ${playerName(ev.toPlayerId)}`,
            card: ev.card ?? undefined,
            color: 'text-yellow-300',
          });
          break;
        case 'DIRECTION_REVERSED':
          newEntries.push({
            seq, id: ++feedIdCounter.current,
            text: `Direction reversed`,
            color: 'text-orange-300',
          });
          break;
        case 'PLAYER_SKIPPED':
          newEntries.push({
            seq, id: ++feedIdCounter.current,
            text: `${playerName(ev.playerId)} was skipped`,
            color: 'text-red-300',
          });
          break;
        case 'CHAIN_REACTION':
          newEntries.push({
            seq, id: ++feedIdCounter.current,
            text: `${playerName(ev.targetPlayerId)} takes ${ev.penalty} card penalty`,
            color: 'text-orange-400',
          });
          break;
        case 'DECK_RESHUFFLED':
          newEntries.push({
            seq, id: ++feedIdCounter.current,
            text: 'Deck reshuffled from discard pile',
            color: 'text-amber-400',
          });
          break;
        case 'HOUSE_CHANGED':
          newEntries.push({
            seq, id: ++feedIdCounter.current,
            text: `House changed to ${ev.newSuit}`,
            color: 'text-yellow-400',
          });
          break;
      }
    }
    if (newEntries.length > 0) {
      setFeed(prev => [...newEntries, ...prev].slice(0, 12));
    }
  }, [lastEvents, playerId, game.opponents]);

  const handlePlay = () => {
    if (!selectedCard || !isMyTurn) return;

    if (isQueenReveal) {
      send({
        type: 'PLAYER_ACTION',
        action: { type: 'REVEAL_CARD', card: selectedCard },
      });
      setSelectedIndex(null);
      return;
    }

    if (selectedCard.value === 'jack') {
      setPendingCard(selectedCard);
      setShowSuitPicker(true);
      return;
    }

    if (selectedCard.value === 2 && game.myHand.length > 1) {
      setPendingCard(selectedCard);
      setShowCardGiver(true);
      return;
    }

    if (
      selectedCard.value === 8 &&
      game.pendingEffect?.type === 'seven-chain'
    ) {
      setPendingCard(selectedCard);
      setShowChainChoice(true);
      return;
    }

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

  return {
    // State
    selectedIndex,
    setSelectedIndex,
    showCardPicker,
    setShowCardPicker,
    showSuitPicker,
    setShowSuitPicker,
    showCardGiver,
    setShowCardGiver,
    showChainChoice,
    setShowChainChoice,
    pendingCard,
    feed,
    revealCard,
    playedCard,

    // Derived
    isMyTurn,
    selectedCard,
    isQueenReveal,
    nextPlayerId,
    playableCards,

    // Handlers
    handlePlay,
    handleDraw,
    handlePass,
    handleAnnounce,
    handleChallenge,
    handleSuitPicked,
    handleCardGiven,
    handleChainChoice,
  };
}
