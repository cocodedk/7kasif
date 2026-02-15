import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Jack — no declared suit rejected', () => {
  it('should reject Jack when declaredSuit is not provided', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Jc'), c('9h')],
        [c('Ks'), c('Qh')],
      ],
      firstCard: c('4d'),
    });

    log('p2 tries J♣ without declaring a suit');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Jc') });
    expect(r1.ok).toBe(false);
    if (r1.ok) return;

    log('Verify: rejected — must declare a suit');
    expect(r1.reason).toContain('declare');
  });
});
