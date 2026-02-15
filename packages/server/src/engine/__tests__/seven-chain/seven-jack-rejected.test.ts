import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Seven — Jack rejected', () => {
  it('should reject Jack during seven-chain', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7h'), c('9c')],
        [c('Jh'), c('Ks')],
      ],
      firstCard: c('4h'),
    });

    log('p2 plays 7♥');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 tries to play J♥ with hearts suit (should be rejected)');
    const r2 = applyAction(r1.newState, 'p3', {
      type: 'PLAY_CARD',
      card: c('Jh'),
      declaredSuit: 'hearts',
    });
    expect(r2.ok).toBe(false);
    if (r2.ok) return;
    log('Verify: action rejected — Jack not allowed during chain');
    expect(r2.reason).toContain('chain reaction');
  });
});
