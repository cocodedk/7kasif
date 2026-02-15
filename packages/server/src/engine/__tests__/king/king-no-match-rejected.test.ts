import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('King — no match rejected', () => {
  it('should reject King that does not match suit or value', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Kc'), c('9h')],
        [c('3d'), c('Qh')],
      ],
      firstCard: c('4h'),
    });

    log('p2 tries K♣ (no match — 4♥ on discard)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Kc') });
    expect(r1.ok).toBe(false);

    log('Verify: rejected — card does not match house');
  });
});
