import { useState, useCallback } from 'react';
import type { PlayerView, ClientMessage } from '@hafte-kasif/shared';
import { GameBoard } from './components/GameBoard.js';

const INITIAL_GAME: PlayerView = {
  phase: 'playing',
  myHand: [
    { suit: 'hearts', value: 7 },
    { suit: 'hearts', value: 'queen' },
    { suit: 'hearts', value: 3 },
    { suit: 'diamonds', value: 3 },
    { suit: 'diamonds', value: 5 },
    { suit: 'diamonds', value: 'king' },
    { suit: 'clubs', value: 'ace' },
    { suit: 'clubs', value: 4 },
    { suit: 'clubs', value: 9 },
    { suit: 'spades', value: 'jack' },
    { suit: 'spades', value: 10 },
    { suit: 'spades', value: 2 },
  ],
  myRevealedCards: [],
  opponents: [
    { id: 'opp1', name: 'Alice', cardCount: 4, revealedCards: [], hasAnnouncedOneCard: false },
    { id: 'opp2', name: 'Bob', cardCount: 2, revealedCards: [{ suit: 'hearts', value: 'king' }], hasAnnouncedOneCard: false },
    { id: 'opp3', name: 'Charlie', cardCount: 1, revealedCards: [], hasAnnouncedOneCard: true },
  ],
  currentPlayerId: 'dev-player',
  direction: 1,
  topDiscard: { suit: 'hearts', value: 5 },
  deckCount: 22,
  pendingEffect: null,
  declaredSuit: null,
  mode: 'standard',
};

function passTurnBriefly(setGame: React.Dispatch<React.SetStateAction<PlayerView>>) {
  setGame(prev => ({ ...prev, currentPlayerId: prev.opponents[0].id }));
  setTimeout(() => {
    setGame(prev => ({ ...prev, currentPlayerId: 'dev-player' }));
  }, 1000);
}

export function DevPreview() {
  const [game, setGame] = useState<PlayerView>(INITIAL_GAME);
  const [error, setError] = useState<string | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);

  const send = useCallback((msg: ClientMessage) => {
    if (msg.type !== 'PLAYER_ACTION') return;
    const action = msg.action;

    if (action.type === 'PLAY_CARD') {
      const playedAce = action.card.value === 'ace';

      setGame(prev => {
        const toRemove = [action.card];
        if (action.giveCard) toRemove.push(action.giveCard);
        const newHand = prev.myHand.filter(
          c => !toRemove.some(r => r.suit === c.suit && r.value === c.value)
        );

        // Queen effect: reveal a random card from the next opponent
        const opponents = prev.opponents;
        let newOpponents = opponents;
        if (action.card.value === 'queen' && opponents.length > 0) {
          const target = opponents[0];
          if (target.cardCount > target.revealedCards.length) {
            const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
            const values = [2, 3, 4, 5, 6, 7, 8, 9, 10, 'jack', 'queen', 'king', 'ace'] as const;
            const fakeCard = {
              suit: suits[Math.floor(Math.random() * 4)],
              value: values[Math.floor(Math.random() * 13)],
            };
            newOpponents = opponents.map((o, i) =>
              i === 0 ? { ...o, revealedCards: [...o.revealedCards, fakeCard] } : o
            );
          }
        }

        return {
          ...prev,
          myHand: newHand,
          opponents: newOpponents,
          topDiscard: action.card,
          declaredSuit: action.declaredSuit ?? null,
        };
      });
      setHasDrawn(false);
      setError(null);

      // Non-ace: auto-pass to next player
      if (!playedAce) {
        passTurnBriefly(setGame);
      }
    } else if (action.type === 'DRAW_CARD') {
      const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
      const values = [2, 3, 4, 5, 6, 7, 8, 9, 10, 'jack', 'queen', 'king', 'ace'] as const;
      const card = {
        suit: suits[Math.floor(Math.random() * 4)],
        value: values[Math.floor(Math.random() * 13)],
      };
      setGame(prev => ({
        ...prev,
        myHand: [...prev.myHand, card],
        deckCount: prev.deckCount - 1,
      }));
      setHasDrawn(true);
      setError(null);
    } else if (action.type === 'PASS_TURN') {
      if (!hasDrawn) {
        setError('You must draw or play a card before passing');
        return;
      }
      setHasDrawn(false);
      setError(null);
      passTurnBriefly(setGame);
    }
  }, [hasDrawn]);

  return (
    <div>
      <GameBoard
        game={game}
        playerId="dev-player"
        error={error}
        send={send}
        canPass={hasDrawn}
        hasDrawn={hasDrawn}
      />
      <button
        onClick={() => { setGame(INITIAL_GAME); setHasDrawn(false); setError(null); }}
        className="fixed top-1 right-1 bg-gray-700 text-white text-[10px] px-2 py-1 rounded opacity-50 z-[100]"
      >
        Reset
      </button>
    </div>
  );
}
