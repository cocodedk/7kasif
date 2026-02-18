import type {
  GameState, Card, Action, PlayCardAction, RevealCardAction, DeclareSuitAction, Suit, PendingChain, PendingAce, PendingPenalty,
} from '@hafte-kasif/shared';
import { cardEquals } from '@hafte-kasif/shared';

export function isCurrentPlayer(state: GameState, playerId: string): boolean {
  return state.players[state.currentPlayerIndex].id === playerId;
}

export function hasCardInHand(state: GameState, playerId: string, card: Card): boolean {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return false;
  return player.hand.some(c => cardEquals(c, card));
}

export function getTopDiscard(state: GameState): Card | null {
  return state.discardPile.length > 0 ? state.discardPile[state.discardPile.length - 1] : null;
}

export function getDeclaredSuit(state: GameState): Suit | null {
  // Check if last played card was a Jack with a declared suit
  if (state.lastAction?.type === 'PLAY_CARD' && state.lastAction.card.value === 'jack') {
    return state.lastAction.declaredSuit ?? null;
  }
  return null;
}

export function getEffectiveHouse(state: GameState): Suit | null {
  const declared = getDeclaredSuit(state);
  if (declared) return declared;
  const top = getTopDiscard(state);
  return top?.suit ?? null;
}

export function cardMatchesHouse(card: Card, state: GameState): boolean {
  // Jack is wild — always matches
  if (card.value === 'jack') return true;

  const top = getTopDiscard(state);
  if (!top) return true; // no discard yet, anything goes

  const declaredSuit = getDeclaredSuit(state);

  // Match by suit (or declared suit if Jack was played)
  if (declaredSuit) {
    if (card.suit === declaredSuit) return true;
    if (card.value === top.value) return true;
    return false;
  }

  // Match by same suit or same value
  if (card.suit === top.suit) return true;
  if (card.value === top.value) return true;

  return false;
}

export function canPlayInChain(card: Card, chain: PendingChain, mode: GameState['mode']): boolean {
  // In a 7-chain, only 7, 8, and 10 can be played
  if (card.value === 7) return true;

  if (mode === 'freestyle') {
    return card.value === 8 || card.value === 10;
  }

  // Standard mode: 8 and 10 must match the chain suit
  if (card.value === 8 && card.suit === chain.suit) return true;
  if (card.value === 10 && card.suit === chain.suit) return true;

  return false;
}

export function canPlayOnAce(card: Card, aceEffect: PendingAce): boolean {
  // Can play another Ace
  if (card.value === 'ace') return true;
  // Jack is wild — always playable
  if (card.value === 'jack') return true;
  // Or a card matching the suit of the last Ace
  if (card.suit === aceEffect.suit) return true;
  return false;
}

export function validatePlayCard(
  state: GameState,
  playerId: string,
  action: PlayCardAction,
): string | null {
  if (!isCurrentPlayer(state, playerId)) {
    return 'Not your turn';
  }

  // Block play during queen-reveal — must reveal first
  if (state.pendingEffect?.type === 'queen-reveal' && state.pendingEffect.targetPlayerId === playerId) {
    return 'You must reveal a card first';
  }
  // Block play during jack-declare — must declare suit first
  if (state.pendingEffect?.type === 'jack-declare') {
    return 'You must declare a suit for the initial Jack first';
  }

  if (!hasCardInHand(state, playerId, action.card)) {
    return 'Card not in your hand';
  }

  const { card } = action;

  // During seven-penalty: can only play after drawing minimum
  if (state.pendingEffect?.type === 'seven-penalty') {
    if (state.pendingEffect.drawn < state.pendingEffect.penalty) {
      return 'Must keep drawing — penalty not yet fulfilled';
    }
    // drawn >= penalty: normal play rules apply
    if (!cardMatchesHouse(card, state)) {
      return 'Card does not match the current house (suit or value)';
    }
    // Jack requires declared suit
    if (card.value === 'jack' && !action.declaredSuit) {
      return 'Must declare a suit when playing a Jack';
    }
    // 2 requires giveCard
    const player = state.players.find(p => p.id === playerId)!;
    if (card.value === 2 && player.hand.length > 1 && !action.giveCard) {
      return 'Must specify a card to give when playing a 2';
    }
    if (card.value === 2 && action.giveCard) {
      if (cardEquals(action.giveCard, card)) {
        return 'Cannot give the same card you are playing';
      }
      if (!player.hand.some(c => cardEquals(c, action.giveCard!))) {
        return 'Give card not in your hand';
      }
    }
    return null;
  }

  // During a 7-8-10 chain reaction
  if (state.pendingEffect?.type === 'seven-chain') {
    if (!canPlayInChain(card, state.pendingEffect, state.mode)) {
      return 'During a chain reaction, you can only play 7, 8 (same suit), or 10 (same suit)';
    }
    if (card.value === 8 && !action.chainChoice) {
      return 'Must specify chainChoice (redirect or add) when playing 8 in a chain';
    }
    return null;
  }

  // During an Ace chain
  if (state.pendingEffect?.type === 'ace-chain') {
    if (!canPlayOnAce(card, state.pendingEffect)) {
      return `Must play an Ace, a Jack, or a card of ${state.pendingEffect.suit}`;
    }
    // Jack requires declared suit even during ace chain
    if (card.value === 'jack' && !action.declaredSuit) {
      return 'Must declare a suit when playing a Jack';
    }
    return null;
  }

  // Jack requires declared suit
  if (card.value === 'jack' && !action.declaredSuit) {
    return 'Must declare a suit when playing a Jack';
  }

  // 2 requires a card to give (unless it's the last card)
  const player = state.players.find(p => p.id === playerId)!;
  if (card.value === 2 && player.hand.length > 1 && !action.giveCard) {
    return 'Must specify a card to give when playing a 2';
  }
  if (card.value === 2 && action.giveCard) {
    // Verify the give card is in hand and is not the card being played
    if (cardEquals(action.giveCard, card)) {
      return 'Cannot give the same card you are playing';
    }
    if (!player.hand.some(c => cardEquals(c, action.giveCard!))) {
      return 'Give card not in your hand';
    }
  }

  // Check card matches house
  if (!cardMatchesHouse(card, state)) {
    return 'Card does not match the current house (suit or value)';
  }

  // Check locked card restriction — cards just revealed by Queen can't be played this turn
  const playerObj = state.players.find(p => p.id === playerId)!;
  if (playerObj.lockedCards.some(c => cardEquals(c, card))) {
    return 'Cannot play a card that was just revealed this turn';
  }

  return null;
}

export function validateDrawCard(state: GameState, playerId: string): string | null {
  if (!isCurrentPlayer(state, playerId)) {
    return 'Not your turn';
  }
  // Block draw during queen-reveal
  if (state.pendingEffect?.type === 'queen-reveal' && state.pendingEffect.targetPlayerId === playerId) {
    return 'You must reveal a card first';
  }
  // Block draw during jack-declare
  if (state.pendingEffect?.type === 'jack-declare') {
    return 'You must declare a suit for the initial Jack first';
  }
  // During seven-chain: always allow draw (accept chain penalty)
  if (state.pendingEffect?.type === 'seven-chain') {
    return null;
  }
  // During seven-penalty: can draw up to penalty + 1 (the optional extra)
  if (state.pendingEffect?.type === 'seven-penalty') {
    if (state.pendingEffect.drawn > state.pendingEffect.penalty) {
      return 'Already drew the maximum cards for this penalty';
    }
    return null;
  }
  // During ace-chain: always allow draw (break chain)
  if (state.pendingEffect?.type === 'ace-chain') {
    return null;
  }
  // Normal turn: only one draw allowed
  if (state.hasDrawnThisTurn) {
    return 'Already drew a card this turn';
  }
  return null;
}

export function validatePassTurn(state: GameState, playerId: string): string | null {
  if (!isCurrentPlayer(state, playerId)) {
    return 'Not your turn';
  }

  // Block pass during queen-reveal
  if (state.pendingEffect?.type === 'queen-reveal' && state.pendingEffect.targetPlayerId === playerId) {
    return 'You must reveal a card first';
  }
  // Block pass during jack-declare
  if (state.pendingEffect?.type === 'jack-declare') {
    return 'You must declare a suit for the initial Jack first';
  }

  // Can't pass during a 7-chain — must counter or accept (draw)
  if (state.pendingEffect?.type === 'seven-chain') {
    return 'Cannot pass during a chain reaction — you must counter or draw';
  }

  // Can't pass during an ace-chain — must play or draw
  if (state.pendingEffect?.type === 'ace-chain') {
    return 'Cannot pass during an ace chain — you must play or draw';
  }

  // During seven-penalty: can only pass after drawing the minimum
  if (state.pendingEffect?.type === 'seven-penalty') {
    if (state.pendingEffect.drawn < state.pendingEffect.penalty) {
      return 'Must keep drawing — penalty not yet fulfilled';
    }
    return null;
  }

  // Normal turn: must draw or play before passing
  if (!state.hasDrawnThisTurn) {
    return 'You must draw or play a card before passing';
  }

  return null;
}

export function validateRevealCard(
  state: GameState,
  playerId: string,
  action: RevealCardAction,
): string | null {
  if (!isCurrentPlayer(state, playerId)) {
    return 'Not your turn';
  }
  if (state.pendingEffect?.type !== 'queen-reveal') {
    return 'No queen reveal pending';
  }
  if (state.pendingEffect.targetPlayerId !== playerId) {
    return 'You are not the target of the queen reveal';
  }
  if (!hasCardInHand(state, playerId, action.card)) {
    return 'Card not in your hand';
  }
  const player = state.players.find(p => p.id === playerId)!;
  if (player.revealedCards.some(c => cardEquals(c, action.card))) {
    return 'Card is already revealed';
  }
  return null;
}

export function validateDeclareSuit(
  state: GameState,
  playerId: string,
  action: DeclareSuitAction,
): string | null {
  if (!isCurrentPlayer(state, playerId)) {
    return 'Not your turn';
  }
  if (state.pendingEffect?.type !== 'jack-declare') {
    return 'No suit declaration pending';
  }
  return null;
}

export function validateAction(
  state: GameState,
  playerId: string,
  action: Action,
): string | null {
  if (state.phase !== 'playing') {
    return 'Game is not in progress';
  }

  switch (action.type) {
    case 'PLAY_CARD':
      return validatePlayCard(state, playerId, action);
    case 'DRAW_CARD':
      return validateDrawCard(state, playerId);
    case 'PASS_TURN':
      return validatePassTurn(state, playerId);
    case 'ANNOUNCE_ONE_CARD':
      if (state.players.find(p => p.id === playerId)?.hand.length !== 1) {
        return 'You can only announce when you have exactly 1 card';
      }
      return null;
    case 'CHALLENGE_NO_ANNOUNCEMENT': {
      const target = state.players.find(p => p.id === action.targetPlayerId);
      if (!target) return 'Target player not found';
      if (target.hand.length !== 1) return 'Target does not have 1 card';
      if (target.hasAnnouncedOneCard) return 'Target has already announced';
      return null;
    }
    case 'REVEAL_CARD':
      return validateRevealCard(state, playerId, action);
    case 'DECLARE_SUIT':
      return validateDeclareSuit(state, playerId, action);
    default:
      return 'Unknown action type';
  }
}
