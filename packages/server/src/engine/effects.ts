import type {
  GameState, Card, Action, PlayCardAction, RevealCardAction, GameEvent, Player, Direction,
} from '@hafte-kasif/shared';
import { cardEquals, handValue, FINISH_POINTS } from '@hafte-kasif/shared';

// ─── Helpers ───

function cloneState(state: GameState): GameState {
  return {
    ...state,
    players: state.players.map(p => ({
      ...p,
      hand: [...p.hand],
      revealedCards: [...p.revealedCards],
      lockedCards: [...p.lockedCards],
    })),
    deck: [...state.deck],
    discardPile: [...state.discardPile],
    pendingEffect: state.pendingEffect ? { ...state.pendingEffect } : null,
    losers: [...state.losers],
  };
}

function getPlayerIndex(state: GameState, playerId: string): number {
  return state.players.findIndex(p => p.id === playerId);
}

function nextPlayerIndex(state: GameState, from: number, steps: number = 1): number {
  const count = state.players.length;
  return ((from + state.direction * steps) % count + count) % count;
}

function removeCardFromHand(player: Player, card: Card): void {
  const idx = player.hand.findIndex(c => cardEquals(c, card));
  if (idx !== -1) player.hand.splice(idx, 1);
  // Also remove from revealed if it was revealed
  const revIdx = player.revealedCards.findIndex(c => cardEquals(c, card));
  if (revIdx !== -1) player.revealedCards.splice(revIdx, 1);
  // Also remove from locked if it was locked
  const lockIdx = player.lockedCards.findIndex(c => cardEquals(c, card));
  if (lockIdx !== -1) player.lockedCards.splice(lockIdx, 1);
}

function drawCards(state: GameState, playerIndex: number, count: number): GameEvent[] {
  const events: GameEvent[] = [];
  const player = state.players[playerIndex];
  for (let i = 0; i < count; i++) {
    if (state.deck.length === 0) {
      if (reshuffleDeck(state)) {
        events.push({ type: 'DECK_RESHUFFLED' });
      }
    }
    if (state.deck.length === 0) break; // truly empty
    const card = state.deck.pop()!;
    player.hand.push(card);
  }
  events.push({ type: 'CARD_DRAWN', playerId: player.id, count });
  // Reset one-card announcement if they now have more than 1
  if (player.hand.length > 1) {
    player.hasAnnouncedOneCard = false;
  }
  return events;
}

function reshuffleDeck(state: GameState): boolean {
  if (state.discardPile.length <= 1) return false;
  const topCard = state.discardPile.pop()!;
  const cards = state.discardPile.splice(0);
  // Shuffle
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  state.deck.push(...cards);
  state.discardPile = [topCard];
  return true;
}

function advanceTurn(state: GameState, steps: number = 1): void {
  state.currentPlayerIndex = nextPlayerIndex(state, state.currentPlayerIndex, steps);
  // Clear lockedCards for the player whose turn it now is
  state.players[state.currentPlayerIndex].lockedCards = [];
  // Reset draw flag for the new turn
  state.hasDrawnThisTurn = false;
}

// ─── Win/Lose Calculation ───

function calculateGameEnd(state: GameState, winnerId: string, finishingCard: Card): GameEvent[] {
  const events: GameEvent[] = [];

  // Determine points based on finishing card
  let points: number;
  if (finishingCard.value === 'jack') {
    points = FINISH_POINTS.jack;
  } else if (finishingCard.value === 2) {
    // Check if it was the very last card (no give happened)
    const winner = state.players.find(p => p.id === winnerId)!;
    if (winner.hand.length === 0) {
      // Need to check if a card was given — tracked via lastAction
      const lastAction = state.lastAction as PlayCardAction;
      points = lastAction.giveCard ? FINISH_POINTS.two_with_give : FINISH_POINTS.two_empty;
    } else {
      points = FINISH_POINTS.normal;
    }
  } else {
    points = FINISH_POINTS.normal;
  }

  // Check for 4-Ace chain finish
  if (state.pendingEffect?.type === 'ace-chain' && state.pendingEffect.acesPlayed === 4) {
    points = FINISH_POINTS.ace_chain_full;
  }

  // Find loser(s) — 7s in hand take priority
  const otherPlayers = state.players.filter(p => p.id !== winnerId);

  // Count 7s in each player's hand
  const withSevens = otherPlayers
    .map(p => ({ player: p, sevens: p.hand.filter(c => c.value === 7).length }))
    .filter(p => p.sevens > 0);

  let candidates: { player: typeof otherPlayers[0]; value: number }[];

  if (withSevens.length > 0) {
    // Players with 7s are the loser candidates
    const maxSevens = Math.max(...withSevens.map(p => p.sevens));
    const topSevens = withSevens.filter(p => p.sevens === maxSevens);

    if (topSevens.length === 1) {
      // One player has the most 7s — they lose
      candidates = [{ player: topSevens[0].player, value: handValue(topSevens[0].player.hand) }];
    } else {
      // Tied on 7 count — compare hand values among them
      candidates = topSevens.map(p => ({ player: p.player, value: handValue(p.player.hand) }));
      const maxVal = Math.max(...candidates.map(c => c.value));
      candidates = candidates.filter(c => c.value === maxVal);
    }
  } else {
    // No one has 7s — normal hand value comparison
    candidates = otherPlayers.map(p => ({ player: p, value: handValue(p.hand) }));
    const maxVal = Math.max(...candidates.map(c => c.value));
    candidates = candidates.filter(c => c.value === maxVal);
  }

  let reversed = false;
  if (candidates.length > 1) {
    // Tie — reversal!
    reversed = true;
  }

  const loserIds = candidates.map(l => l.player.id);

  state.phase = 'finished';
  state.winner = reversed ? null : winnerId;
  state.losers = reversed ? [winnerId] : loserIds;
  state.finishingCard = finishingCard;

  // Build hand summaries for all non-winner players
  const hands = otherPlayers.map(p => ({
    playerId: p.id,
    playerName: p.name,
    handValue: handValue(p.hand),
    sevens: p.hand.filter(c => c.value === 7).length,
    cardCount: p.hand.length,
  }));

  events.push({
    type: 'GAME_OVER',
    winnerId,
    loserId: reversed ? winnerId : loserIds[0],
    points,
    reversed,
    hands,
  });

  return events;
}

// ─── Effect Handlers ───

function applyPlayCard(state: GameState, playerId: string, action: PlayCardAction): GameEvent[] {
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
  }

  // Handle Ace chain continuation
  if (state.pendingEffect?.type === 'ace-chain') {
    if (card.value === 'ace') {
      state.pendingEffect.suit = card.suit;
      state.pendingEffect.acesPlayed++;
      // Check if player's hand is empty after Ace
      if (player.hand.length === 0) {
        events.push(...calculateGameEnd(state, playerId, card));
      }
      // Stay on same player — they must play again or draw
      return events;
    } else {
      // Non-Ace card ends the Ace chain
      const acesPlayed = state.pendingEffect.acesPlayed;
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

function applyCardEffect(
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
    events.push(...calculateGameEnd(state, playerId, card));
    return events;
  }

  switch (card.value) {
    case 'ace': {
      // Start Ace chain
      state.pendingEffect = { type: 'ace-chain', suit: card.suit, acesPlayed: 1 };
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

function applyChainCounter(
  state: GameState,
  playerId: string,
  action: PlayCardAction,
  events: GameEvent[],
): GameEvent[] {
  const chain = state.pendingEffect as { type: 'seven-chain'; penalty: number; suit: string };
  const { card } = action;

  if (card.value === 7) {
    // Add 2 to penalty, update chain suit to this 7's suit, pass to next
    chain.penalty += 2;
    chain.suit = card.suit;
    advanceTurn(state);
    return events;
  }

  if (card.value === 8) {
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
    advanceTurn(state);
    return events;
  }

  return events;
}

// ─── Draw Card Effect ───

function applyDrawCard(state: GameState, playerId: string): GameEvent[] {
  const events: GameEvent[] = [];
  const playerIdx = getPlayerIndex(state, playerId);

  if (state.pendingEffect?.type === 'seven-chain') {
    // Accept the chain — transition to incremental penalty drawing
    const penalty = state.pendingEffect.penalty;
    events.push({ type: 'CHAIN_REACTION', penalty, targetPlayerId: playerId });
    events.push(...drawCards(state, playerIdx, 1));
    state.pendingEffect = {
      type: 'seven-penalty',
      penalty,
      drawn: 1,
      suit: state.pendingEffect.suit,
    };
    // Stay on current player — they must keep drawing
    return events;
  }

  if (state.pendingEffect?.type === 'seven-penalty') {
    const pen = state.pendingEffect;
    events.push(...drawCards(state, playerIdx, 1));
    pen.drawn++;
    if (pen.drawn > pen.penalty) {
      // Took the optional extra draw — stay on player so they can play or pass
      state.pendingEffect = null;
    }
    // Otherwise stay on current player
    return events;
  }

  if (state.pendingEffect?.type === 'ace-chain') {
    // Draw during Ace chain — stay on player so they can play or pass
    events.push(...drawCards(state, playerIdx, 1));
    state.pendingEffect = null;
    state.hasDrawnThisTurn = true;
    return events;
  }

  // Normal draw
  events.push(...drawCards(state, playerIdx, 1));
  state.hasDrawnThisTurn = true;
  // Turn does NOT end — player can still play or pass
  return events;
}

// ─── Pass Turn Effect ───

function applyPassTurn(state: GameState, playerId: string): GameEvent[] {
  const events: GameEvent[] = [];
  // Clear seven-penalty effect when passing (drawn >= penalty)
  if (state.pendingEffect?.type === 'seven-penalty') {
    state.pendingEffect = null;
  }
  events.push({ type: 'TURN_PASSED', playerId });
  advanceTurn(state);
  return events;
}

// ─── Reveal Card (Queen) ───

function applyRevealCard(state: GameState, playerId: string, action: RevealCardAction): GameEvent[] {
  const events: GameEvent[] = [];
  const player = state.players.find(p => p.id === playerId)!;
  const { card } = action;

  // Add to revealedCards (visible to all, persists until played)
  player.revealedCards.push(card);
  // Add to lockedCards (can't play this turn, cleared on next advanceTurn)
  player.lockedCards.push(card);

  events.push({ type: 'CARD_REVEALED', playerId, card });

  // Clear the queen-reveal pending effect
  state.pendingEffect = null;

  // Do NOT advance turn — player takes their normal turn next
  return events;
}

// ─── Announce / Challenge ───

function applyAnnounceOneCard(state: GameState, playerId: string): GameEvent[] {
  const player = state.players.find(p => p.id === playerId)!;
  player.hasAnnouncedOneCard = true;
  return [{ type: 'ONE_CARD_ANNOUNCED', playerId }];
}

function applyChallengeNoAnnouncement(
  state: GameState,
  challengerId: string,
  targetPlayerId: string,
): GameEvent[] {
  const events: GameEvent[] = [];
  const target = state.players.find(p => p.id === targetPlayerId)!;
  const targetIdx = getPlayerIndex(state, targetPlayerId);

  if (target.hand.length === 1 && !target.hasAnnouncedOneCard) {
    // Penalty: draw 1 card
    events.push(...drawCards(state, targetIdx, 1));
    events.push({
      type: 'ANNOUNCEMENT_CHALLENGED',
      challengerId,
      targetPlayerId,
      penalty: true,
    });
  } else {
    events.push({
      type: 'ANNOUNCEMENT_CHALLENGED',
      challengerId,
      targetPlayerId,
      penalty: false,
    });
  }

  return events;
}

// ─── Main Effect Dispatcher ───

export function applyEffect(
  state: GameState,
  playerId: string,
  action: Action,
): { newState: GameState; events: GameEvent[] } {
  const newState = cloneState(state);
  let events: GameEvent[] = [];

  switch (action.type) {
    case 'PLAY_CARD':
      events = applyPlayCard(newState, playerId, action);
      break;
    case 'DRAW_CARD':
      events = applyDrawCard(newState, playerId);
      break;
    case 'PASS_TURN':
      events = applyPassTurn(newState, playerId);
      break;
    case 'ANNOUNCE_ONE_CARD':
      events = applyAnnounceOneCard(newState, playerId);
      break;
    case 'CHALLENGE_NO_ANNOUNCEMENT':
      events = applyChallengeNoAnnouncement(newState, playerId, action.targetPlayerId);
      break;
    case 'REVEAL_CARD':
      events = applyRevealCard(newState, playerId, action);
      break;
  }

  return { newState, events };
}
