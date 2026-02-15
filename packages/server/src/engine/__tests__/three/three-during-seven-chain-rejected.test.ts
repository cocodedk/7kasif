import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Three — during seven-chain rejected', () => {
  it('should reject 3 during an active seven-chain', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],       // p1
        [c('7h'), c('9c')],       // p2
        [c('3h'), c('Ks')],       // p3
      ],
      firstCard: c('4h'),
    });

    log('p2 plays 7♥ to start chain');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 tries 3♥ during seven-chain (should be rejected)');
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('3h') });
    expect(r2.ok).toBe(false);
    if (r2.ok) return;

    log('Verify: rejected — only 7/8/10 allowed during chain');
    expect(r2.reason).toContain('chain reaction');
  });
});
