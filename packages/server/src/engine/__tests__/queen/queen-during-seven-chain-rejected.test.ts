import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Queen — during seven-chain rejected', () => {
  it('should reject Queen during an active seven-chain', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7h'), c('9c')],
        [c('Qh'), c('Ks')],
      ],
      firstCard: c('4h'),
    });

    log('p2 plays 7♥ to start chain');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 tries Q♥ during seven-chain (should be rejected)');
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('Qh') });
    expect(r2.ok).toBe(false);
    if (r2.ok) return;

    log('Verify: rejected — only 7/8/10 allowed during chain');
    expect(r2.reason).toContain('chain reaction');
  });
});
