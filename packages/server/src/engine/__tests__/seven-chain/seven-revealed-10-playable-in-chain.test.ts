import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';
import { isCardPlayable } from '@hafte-kasif/shared';
import type { PlayerView } from '@hafte-kasif/shared';

describe('Seven chain — revealed 10 should be playable', () => {
  it('revealed 10♠ should be playable during a 7♠ chain (standard mode)', () => {
    // Scenario: p3 has a revealed 10♠ and unrevealed 8♠
    // p2 plays 7♠, chain suit = spades → p3 should be able to play 10♠
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7s'), c('9c')],
        [c('10s'), c('8s')],
      ],
      firstCard: c('4s'),
      currentPlayerIndex: 1,
      mode: 'standard',
    });

    // Simulate p3 having a revealed 10♠ (from a previous queen)
    state.players[2].revealedCards = [c('10s')];

    log('p2 plays 7♠ (starts chain, suit=spades)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7s') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    expect(r1.newState.pendingEffect).toEqual({ type: 'seven-chain', penalty: 2, suit: 'spades' });
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p3');

    log('Verify: server validator allows p3 to play 10♠');
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('10s') });
    expect(r2.ok).toBe(true);

    log('Verify: server validator also allows p3 to play 8♠');
    const r2b = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('8s'), chainChoice: 'add' });
    expect(r2b.ok).toBe(true);
  });

  it('client-side isCardPlayable marks revealed 10♠ playable during 7♠ chain', () => {
    // Simulate the PlayerView that the client would receive
    const view: PlayerView = {
      phase: 'playing',
      myHand: [c('10s'), c('8s')],
      myRevealedCards: [c('10s')],
      opponents: [],
      currentPlayerId: 'p3',
      direction: 1,
      topDiscard: c('7s'),
      deckCount: 40,
      pendingEffect: { type: 'seven-chain', penalty: 2, suit: 'spades' },
      declaredSuit: null,
      hasDrawnThisTurn: false,
      mode: 'standard',
    };

    log('Verify: isCardPlayable returns true for 10♠ during spades chain');
    expect(isCardPlayable(c('10s'), view)).toBe(true);

    log('Verify: isCardPlayable returns true for 8♠ during spades chain');
    expect(isCardPlayable(c('8s'), view)).toBe(true);
  });

  it('revealed 10♠ NOT playable during 7♥ chain (different suit, standard mode)', () => {
    const view: PlayerView = {
      phase: 'playing',
      myHand: [c('10s'), c('8s')],
      myRevealedCards: [c('10s')],
      opponents: [],
      currentPlayerId: 'p3',
      direction: 1,
      topDiscard: c('7h'),
      deckCount: 40,
      pendingEffect: { type: 'seven-chain', penalty: 2, suit: 'hearts' },
      declaredSuit: null,
      hasDrawnThisTurn: false,
      mode: 'standard',
    };

    log('Verify: 10♠ NOT playable during hearts chain (standard mode)');
    expect(isCardPlayable(c('10s'), view)).toBe(false);

    log('Verify: 8♠ NOT playable during hearts chain (standard mode)');
    expect(isCardPlayable(c('8s'), view)).toBe(false);
  });

  it('locked 10♠ (just revealed by queen this turn) IS playable during chain', () => {
    // Edge case: queen revealed the card this very turn, then a 7 chain hits
    // lockedCards blocks normal play but chain play should bypass it
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7s'), c('9c')],
        [c('10s'), c('8s')],
      ],
      firstCard: c('4s'),
      currentPlayerIndex: 1,
      mode: 'standard',
    });

    // Simulate p3 having a locked 10♠ (just revealed this turn)
    state.players[2].revealedCards = [c('10s')];
    state.players[2].lockedCards = [c('10s')];

    log('p2 plays 7♠');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7s') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: p3 can play locked 10♠ during chain (chain overrides lock)');
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('10s') });
    expect(r2.ok).toBe(true);
  });
});
