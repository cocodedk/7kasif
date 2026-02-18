import type {
  GameState, Action, RevealCardAction, DeclareSuitAction, GameEvent,
} from '@hafte-kasif/shared';
import { cloneState, getPlayerIndex, drawCards, advanceTurn } from './state-helpers.js';
import { calculateGameEnd } from './game-end.js';
import { applyPlayCard } from './card-effects.js';

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
    // Clear pendingWinner if the drawing player is the pending winner (chain wrapped back)
    if (state.pendingWinner?.playerId === playerId) {
      state.pendingWinner = null;
    }
    // Stay on current player — they must keep drawing
    return events;
  }

  if (state.pendingEffect?.type === 'seven-penalty') {
    const pen = state.pendingEffect;
    events.push(...drawCards(state, playerIdx, 1));
    pen.drawn++;
    // Clear pendingWinner if the drawing player is the pending winner (chain wrapped back)
    if (state.pendingWinner?.playerId === playerId) {
      state.pendingWinner = null;
    }
    if (pen.drawn > pen.penalty) {
      // Took the optional extra draw — stay on player so they can play or pass
      state.pendingEffect = null;
      state.hasDrawnThisTurn = true;
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

  // Resolve deferred winner now that the chain is fully resolved
  if (state.pendingWinner && !state.pendingEffect) {
    events.push(...calculateGameEnd(state, state.pendingWinner.playerId, state.pendingWinner.card));
    state.pendingWinner = null;
  }

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

// ─── Declare Suit (initial Jack) ───

function applyDeclareSuit(state: GameState, _playerId: string, action: DeclareSuitAction): GameEvent[] {
  const events: GameEvent[] = [];
  // Store a synthetic PLAY_CARD lastAction referencing the Jack already on the
  // discard pile. getDeclaredSuit() and getEffectiveHouse() both inspect
  // lastAction.card.value === 'jack' + lastAction.declaredSuit to determine the
  // active house, so this is the simplest way to satisfy those checks without
  // a dedicated state field.
  const topDiscard = state.discardPile[state.discardPile.length - 1];
  state.lastAction = {
    type: 'PLAY_CARD',
    card: topDiscard, // the Jack on the discard pile
    declaredSuit: action.suit,
  };
  state.pendingEffect = null;
  events.push({ type: 'HOUSE_CHANGED', newSuit: action.suit });
  advanceTurn(state);
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
    case 'DECLARE_SUIT':
      events = applyDeclareSuit(newState, playerId, action);
      break;
  }

  return { newState, events };
}
