import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Challenge — challenge player who already announced is rejected', () => {
  it('should reject challenge when target has already announced one card', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('4d'), c('9c')],
        [c('9s'), c('Ks')],
      ],
      firstCard: c('4h'),
      remainingDeck: [c('Qd')],
    });

    log('p2 plays 4d (matches suit of 4h), going down to 1 card');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('4d') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p2 announces one card');
    const r2 = applyAction(r1.newState, 'p2', { type: 'ANNOUNCE_ONE_CARD' });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('p1 tries CHALLENGE_NO_ANNOUNCEMENT targeting p2 who already announced');
    const r3 = applyAction(r2.newState, 'p1', {
      type: 'CHALLENGE_NO_ANNOUNCEMENT',
      targetPlayerId: 'p2',
    });

    log('Verify: challenge is rejected');
    expect(r3.ok).toBe(false);
  });
});
