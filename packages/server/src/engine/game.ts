import type {
  GameState, Action, ActionResult, GameMode, Card, Player,
} from '@hafte-kasif/shared';
import { createDeck, shuffleDeck } from '@hafte-kasif/shared';
import { validateAction } from './validators.js';
import { applyEffect } from './effects.js';

export function createInitialState(
  playerNames: { id: string; name: string }[],
  dealerId: string,
  cardsPerPlayer: number,
  mode: GameMode = 'standard',
  shuffleFn: (deck: Card[]) => Card[] = shuffleDeck,
): GameState {
  const deck = shuffleFn(createDeck());

  const players: Player[] = playerNames.map(({ id, name }) => ({
    id,
    name,
    hand: [],
    revealedCards: [],
    lockedCards: [],
    hasAnnouncedOneCard: false,
  }));

  // Deal cards
  for (let i = 0; i < cardsPerPlayer; i++) {
    for (const player of players) {
      const card = deck.pop()!;
      player.hand.push(card);
    }
  }

  // Flip first card
  const firstCard = deck.pop()!;
  const discardPile = [firstCard];

  // Dealer is treated as the one who "played" the first card
  const dealerIndex = players.findIndex(p => p.id === dealerId);
  const firstPlayerIndex = (dealerIndex + 1) % players.length;

  const state: GameState = {
    phase: 'playing',
    players,
    currentPlayerIndex: firstPlayerIndex,
    direction: 1,
    deck,
    discardPile,
    pendingEffect: null,
    dealerId,
    cardsPerPlayer,
    mode,
    lastAction: null,
    hasDrawnThisTurn: false,
    winner: null,
    losers: [],
    finishingCard: null,
    pendingWinner: null,
  };

  // Apply first card effects (dealer is treated as the player who played it)
  applyFirstCardEffects(state, dealerIndex, firstCard);

  return state;
}

function applyFirstCardEffects(state: GameState, dealerIndex: number, card: Card): void {
  const nextIdx = (idx: number, steps: number = 1) => {
    const count = state.players.length;
    return ((idx + state.direction * steps) % count + count) % count;
  };

  switch (card.value) {
    case 'ace': {
      // Dealer must play a card — set current player to dealer with ace pending
      state.currentPlayerIndex = dealerIndex;
      state.pendingEffect = { type: 'ace-chain', suit: card.suit, acesPlayed: 1 };
      break;
    }
    case 2: {
      // Dealer gives a card to next player
      // This is handled by setting dealer as current player with a pending give
      // For simplicity in the initial flip, dealer must handle this as their action
      state.currentPlayerIndex = dealerIndex;
      // The dealer needs to take a PLAY_CARD-like action to give a card
      // For now, we'll let the game prompt the dealer
      break;
    }
    case 3: {
      // Previous player (before dealer) draws
      const prevIdx = nextIdx(dealerIndex, -1);
      drawCardsFromDeck(state, prevIdx, 1);
      break;
    }
    case 6: {
      // Next two players draw
      const next1 = nextIdx(dealerIndex, 1);
      const next2 = nextIdx(dealerIndex, 2);
      drawCardsFromDeck(state, next1, 1);
      drawCardsFromDeck(state, next2, 1);
      break;
    }
    case 7: {
      // Next player faces chain reaction
      state.pendingEffect = { type: 'seven-chain', penalty: 2, suit: card.suit };
      break;
    }
    case 8: {
      // Skip next player
      state.currentPlayerIndex = nextIdx(dealerIndex, 2);
      break;
    }
    case 9: {
      // 9 of diamonds — all others draw
      if (card.suit === 'diamonds') {
        for (let i = 0; i < state.players.length; i++) {
          if (i !== dealerIndex) {
            drawCardsFromDeck(state, i, 1);
          }
        }
      }
      break;
    }
    case 'king': {
      // Skip next player + they draw 1
      const skippedIdx = nextIdx(dealerIndex, 1);
      drawCardsFromDeck(state, skippedIdx, 1);
      state.currentPlayerIndex = nextIdx(dealerIndex, 2);
      break;
    }
    case 10: {
      // Reverse direction
      state.direction = -1;
      // First player is now to the left of dealer
      state.currentPlayerIndex = nextIdx(dealerIndex, 1);
      break;
    }
    case 'jack': {
      // Dealer chooses house — set dealer as current to make the choice
      state.currentPlayerIndex = dealerIndex;
      state.pendingEffect = { type: 'jack-declare' };
      break;
    }
    case 'queen': {
      // Set pending queen-reveal for the first player
      const firstIdx = nextIdx(dealerIndex, 1);
      const firstPlayer = state.players[firstIdx];
      if (firstPlayer.hand.length > 0) {
        state.pendingEffect = {
          type: 'queen-reveal',
          targetPlayerId: firstPlayer.id,
        };
      }
      break;
    }
    default:
      // Normal card — no effect
      break;
  }
}

function drawCardsFromDeck(state: GameState, playerIndex: number, count: number): void {
  for (let i = 0; i < count; i++) {
    if (state.deck.length === 0) {
      // Reshuffle discard
      if (state.discardPile.length <= 1) return;
      const top = state.discardPile.pop()!;
      const cards = state.discardPile.splice(0);
      for (let j = cards.length - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * (j + 1));
        [cards[j], cards[k]] = [cards[k], cards[j]];
      }
      state.deck.push(...cards);
      state.discardPile = [top];
    }
    if (state.deck.length > 0) {
      state.players[playerIndex].hand.push(state.deck.pop()!);
    }
  }
}

export function applyAction(
  state: GameState,
  playerId: string,
  action: Action,
): ActionResult {
  const error = validateAction(state, playerId, action);
  if (error) {
    return { ok: false, reason: error };
  }

  const { newState, events } = applyEffect(state, playerId, action);
  return { ok: true, newState, events };
}
