import { useEffect, useRef, useState } from 'react';
import type { Card, GameEvent, OpponentView } from '@hafte-kasif/shared';
import { formatCard } from '../utils/cardFormat.js';

export interface FeedEntry {
  seq: number;
  id: number;
  text: string;
  card?: Card;
  color: string;
}

export function useFeed(
  lastEvents: GameEvent[],
  playerId: string,
  opponents: OpponentView[],
): { feed: FeedEntry[]; playedCard: { card: Card; playerName: string } | null } {
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [playedCard, setPlayedCard] = useState<{ card: Card; playerName: string } | null>(null);
  const playedTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const feedIdCounter = useRef(0);
  const feedSeqCounter = useRef(0);

  useEffect(() => {
    return () => clearTimeout(playedTimerRef.current);
  }, []);

  useEffect(() => {
    if (lastEvents.length === 0) return;

    const playerName = (id: string) =>
      id === playerId ? 'You' : (opponents.find(o => o.id === id)?.name ?? 'Opponent');

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
  }, [lastEvents, playerId, opponents]);

  return { feed, playedCard };
}
