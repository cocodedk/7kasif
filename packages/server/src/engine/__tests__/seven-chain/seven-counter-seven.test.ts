import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Seven — counter with another 7', () => {
  it('should accumulate penalty to 4 when countered with a 7', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7h'), c('9c')],
        [c('7d'), c('Ks')],
      ],
      firstCard: c('4h'),
    });

    log('p2 plays 7♥');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    // p3 counters with 7d
    log('p3 counters with 7♦');
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('7d') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: penalty=4, suit preserved');
    expect(r2.newState.pendingEffect).toEqual({
      type: 'seven-chain',
      penalty: 4,
      suit: 'hearts', // keeps original suit
    });
    // Turn passes to p1
    log('Verify: chain continues to p1');
    expect(r2.newState.players[r2.newState.currentPlayerIndex].id).toBe('p1');
  });
});
