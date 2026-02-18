import type { GameState, Card, Suit, PlayCardAction, GameEvent, Direction } from '@hafte-kasif/shared';
import { cardEquals } from '@hafte-kasif/shared';
import { getPlayerIndex, nextPlayerIndex, removeCardFromHand, drawCards, advanceTurn } from './state-helpers.js';
import { calculateGameEnd } from './game-end.js';

export function applyPlayCard(state: GameState, playerId: string, action: PlayCardAction): GameEvent[] {
  const events: GameEvent[] = [];
  const playerIdx = getPlayerIndex(state, playerId);
  const player = state.players[playerIdx];
  const { card } = action;

  // Remove card from hand and add to discard
  removeCardFromHand(player, card);
  state.discardPile.push(card);
  state.lastAction = action;
  events.push({ type: 'CARD_PLAYED', playerId, card });

  // Handle chain reaction counters first
  if (state.pendingEffect?.type === 'seven-chain') {
    return applyChainCounter(state, playerId, action, events);
  }

  // During seven-penalty (drawn >= penalty): clear effect, play as normal
  if (state.pendingEffect?.type === 'seven-penalty') {
    state.pendingEffect = null;
    // Resolve deferred winner now that the chain is fully resolved
    if (state.pendingWinner) {
      events.push(...calculateGameEnd(state, state.pendingWinner.playerId, state.pendingWinner.card));
      state.pendingWinner = null;
      return events;
    }
  }

  // Handle Ace chain continuation
  if (state.pendingEffect?.type === 'ace-chain') {
    if (card.value === 'ace') {
      state.pendingEffect.suit = card.suit;
      state.pendingEffect.acesPlayed++;
      // Reset draw flag — player may draw to break this new ace in the chain
      state.hasDrawnThisTurn = false;
      // Check if player's hand is empty after Ace
      if (player.hand.length === 0) {
        events.push(...calculateGameEnd(state, playerId, card));
      }
      // Stay on same player — they must play again or draw
      return events;
    } else {
      // Non-Ace card ends the Ace chain
      const acesPlayed = state.pendingEffect.acesPlayed;
      // Clear pendingEffect first so calculateGameEnd sees a clean state, then
      // temporarily restore it if all 4 aces were played so scoring can detect
      // the full-ace-chain bonus.
      state.pendingEffect = null;
      // Check win
      if (player.hand.length === 0) {
        // Restore ace count for scoring check
        if (acesPlayed === 4) {
          state.pendingEffect = { type: 'ace-chain', suit: card.suit, acesPlayed: 4 };
        }
        events.push(...calculateGameEnd(state, playerId, card));
        return events;
      }
      // Apply the card's own effect
      return applyCardEffect(state, playerId, card, action, events);
    }
  }

  // Apply card-specific effects
  return applyCardEffect(state, playerId, card, action, events);
}

export function applyCardEffect(
  state: GameState,
  playerId: string,
  card: Card,
  action: PlayCardAction,
  events: GameEvent[],
): GameEvent[] {
  const playerIdx = getPlayerIndex(state, playerId);
  const player = state.players[playerIdx];

  // Check win before effects
  if (player.hand.length === 0 && card.value !== 'ace') {
    // Defer win if this card starts or continues a seven-chain
    if (card.value === 7) {
      state.pendingWinner = { playerId, card };
    } else {
      events.push(...calculateGameEnd(state, playerId, card));
      return events;
    }
  }

  switch (card.value) {
    case 'ace': {
      // Start Ace chain
      state.pendingEffect = { type: 'ace-chain', suit: card.suit, acesPlayed: 1 };
      // Reset draw flag — player may draw to break this ace chain
      state.hasDrawnThisTurn = false;
      // Don't advance turn — player must play again or draw
      return events;
    }

    case 2: {
      // Give a card to next player
      if (action.giveCard && player.hand.length > 0) {
        const nextIdx = nextPlayerIndex(state, playerIdx);
        const nextPlayer = state.players[nextIdx];
        removeCardFromHand(player, action.giveCard);
        nextPlayer.hand.push(action.giveCard);
        events.push({
          type: 'CARD_GIVEN',
          fromPlayerId: playerId,
          toPlayerId: nextPlayer.id,
          card: action.giveCard,
        });
        // Check win after giving
        if (player.hand.length === 0) {
          events.push(...calculateGameEnd(state, playerId, card));
          return events;
        }
      }
      advanceTurn(state);
      return events;
    }

    case 3: {
      // Previous player draws a card
      const prevIdx = nextPlayerIndex(state, playerIdx, -1);
      events.push(...drawCards(state, prevIdx, 1));
      advanceTurn(state);
      return events;
    }

    case 6: {
      // Next two players draw a card each
      const next1 = nextPlayerIndex(state, playerIdx, 1);
      const next2 = nextPlayerIndex(state, playerIdx, 2);
      events.push(...drawCards(state, next1, 1));
      events.push(...drawCards(state, next2, 1));
      advanceTurn(state);
      return events;
    }

    case 7: {
      // Start chain reaction
      state.pendingEffect = { type: 'seven-chain', penalty: 2, suit: card.suit };
      advanceTurn(state);
      return events;
    }

    case 8: {
      // Skip next player
      const skippedIdx = nextPlayerIndex(state, playerIdx, 1);
      events.push({ type: 'PLAYER_SKIPPED', playerId: state.players[skippedIdx].id });
      advanceTurn(state, 2); // skip 1, go to next
      return events;
    }

    case 9: {
      // 9 of diamonds — all others draw
      if (card.suit === 'diamonds') {
        for (let i = 0; i < state.players.length; i++) {
          if (i !== playerIdx) {
            events.push(...drawCards(state, i, 1));
          }
        }
      }
      advanceTurn(state);
      return events;
    }

    case 10: {
      // Reverse direction
      state.direction = (state.direction * -1) as Direction;
      events.push({ type: 'DIRECTION_REVERSED', newDirection: state.direction });
      advanceTurn(state);
      return events;
    }

    case 'jack': {
      // Change house
      if (action.declaredSuit) {
        events.push({ type: 'HOUSE_CHANGED', newSuit: action.declaredSuit });
      }
      advanceTurn(state);
      return events;
    }

    case 'queen': {
      // Set pending effect — next player must choose a card to reveal
      const nextIdx = nextPlayerIndex(state, playerIdx, 1);
      const nextPlayer = state.players[nextIdx];
      const unrevealed = nextPlayer.hand.filter(
        c => !nextPlayer.revealedCards.some(r => cardEquals(r, c)),
      );
      if (unrevealed.length > 0) {
        state.pendingEffect = {
          type: 'queen-reveal',
          targetPlayerId: nextPlayer.id,
        };
      }
      advanceTurn(state);
      return events;
    }

    case 'king': {
      // Skip next player + they draw 1 (saw chain)
      const skippedIdx = nextPlayerIndex(state, playerIdx, 1);
      events.push({ type: 'PLAYER_SKIPPED', playerId: state.players[skippedIdx].id });
      events.push(...drawCards(state, skippedIdx, 1));
      advanceTurn(state, 2);
      return events;
    }

    default: {
      // Normal card (4, 5, non-diamond 9)
      advanceTurn(state);
      return events;
    }
  }
}

export function applyChainCounter(
  state: GameState,
  playerId: string,
  action: PlayCardAction,
  events: GameEvent[],
): GameEvent[] {
  const chain = state.pendingEffect as { type: 'seven-chain'; penalty: number; suit: Suit };
  const { card } = action;
  const player = state.players[getPlayerIndex(state, playerId)];

  if (card.value === 7) {
    // Add 2 to penalty, update chain suit to this 7's suit, pass to next
    chain.penalty += 2;
    chain.suit = card.suit;
    // Defer win if hand is now empty
    if (player.hand.length === 0) {
      state.pendingWinner = { playerId, card };
    }
    advanceTurn(state);
    return events;
  }

  if (card.value === 8) {
    // Defer win if hand is now empty
    if (player.hand.length === 0) {
      state.pendingWinner = { playerId, card };
    }
    if (action.chainChoice === 'redirect') {
      // Redirect penalty to player 2 positions ahead — they draw incrementally
      const playerIdx = getPlayerIndex(state, playerId);
      const targetIdx = nextPlayerIndex(state, playerIdx, 2);
      const target = state.players[targetIdx];
      events.push({ type: 'CHAIN_REACTION', penalty: chain.penalty, targetPlayerId: target.id });
      events.push(...drawCards(state, targetIdx, 1));
      state.pendingEffect = {
        type: 'seven-penalty',
        penalty: chain.penalty,
        drawn: 1,
        suit: chain.suit,
      };
      state.currentPlayerIndex = targetIdx;
    } else {
      // Add 3 to penalty
      chain.penalty += 3;
      advanceTurn(state);
    }
    return events;
  }

  if (card.value === 10) {
    // Reverse direction, penalty stays
    state.direction = (state.direction * -1) as Direction;
    events.push({ type: 'DIRECTION_REVERSED', newDirection: state.direction });
    // Defer win if hand is now empty
    if (player.hand.length === 0) {
      state.pendingWinner = { playerId, card };
    }
    advanceTurn(state);
    return events;
  }

  // Unreachable: validators reject all non-7/8/10 plays during a seven-chain
  throw new Error(`applyChainCounter: unexpected card value "${card.value}" during seven-chain`);
}
