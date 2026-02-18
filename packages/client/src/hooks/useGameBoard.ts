import { useEffect, useMemo, useRef, useState } from 'react';
import type { PlayerView, ClientMessage, Card as CardType, Suit, GameEvent } from '@hafte-kasif/shared';
import { isCardPlayable, cardEquals } from '@hafte-kasif/shared';
import { useFeed } from './useFeed.js';

// Re-export cardFormat symbols for backward compat
export { SUIT_SYMBOLS, VALUE_DISPLAY, formatValue, formatCard } from '../utils/cardFormat.js';
export type { FeedEntry } from './useFeed.js';

export interface GameBoardProps {
  game: PlayerView;
  playerId: string;
  error: string | null;
  send: (msg: ClientMessage) => void;
  lastEvents?: GameEvent[];
}

export function useGameBoard({ game, playerId, error, send, lastEvents = [] }: GameBoardProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showCardPicker, setShowCardPicker] = useState(false);
  const [showSuitPicker, setShowSuitPicker] = useState(false);
  const [showCardGiver, setShowCardGiver] = useState(false);
  const [showChainChoice, setShowChainChoice] = useState(false);
  const [pendingCard, setPendingCard] = useState<CardType | null>(null);

  const { feed, playedCard } = useFeed(lastEvents, playerId, game.opponents);

  const isMyTurn = game.currentPlayerId === playerId;
  const selectedCard = selectedIndex !== null ? game.myHand[selectedIndex] : null;
  const isQueenReveal = game.pendingEffect?.type === 'queen-reveal' &&
    game.pendingEffect.targetPlayerId === playerId && isMyTurn;
  const isJackDeclare = game.pendingEffect?.type === 'jack-declare' && isMyTurn;

  // Auto-show suit picker when dealer needs to declare suit for initial Jack
  useEffect(() => {
    if (isJackDeclare) {
      setShowSuitPicker(true);
    }
  }, [isJackDeclare]);

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
    // Initial Jack declaration (no pending card — dealer just picks suit)
    if (isJackDeclare) {
      send({
        type: 'PLAYER_ACTION',
        action: { type: 'DECLARE_SUIT', suit },
      });
      setShowSuitPicker(false);
      return;
    }
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
    isJackDeclare,
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
