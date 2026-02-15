import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Jack — four players declared suit flow', () => {
  it('should enforce declared suit on next player in 4-player game', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Jc'), c('9h')],
        [c('3h'), c('Ks')],
        [c('6d'), c('2s')],
      ],
      firstCard: c('4d'),
    });

    log('p2 plays J♣ declaring hearts');
    const r1 = applyAction(state, 'p2', {
      type: 'PLAY_CARD',
      card: c('Jc'),
      declaredSuit: 'hearts',
    });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 plays 3♥ (matches declared hearts)');
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('3h') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: turn advances past p3 to p4');
    expect(r2.newState.players[r2.newState.currentPlayerIndex].id).toBe('p4');

    log('p4 can now play by normal rules (declared suit no longer active)');
    // Top discard is 3♥. p4 has 6♦ (no match) and 2♠ (no match).
    // p4 should not be able to play either.
    const r3 = applyAction(r2.newState, 'p4', { type: 'PLAY_CARD', card: c('6d') });
    expect(r3.ok).toBe(false);

    log('Verify: p4 can\'t play 6♦ on 3♥ — normal matching rules apply');
  });
});
