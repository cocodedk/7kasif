import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Eight — no match rejected', () => {
  it('should reject 8 that does not match suit or value', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('8c'), c('9h')],
        [c('Ks'), c('Qh')],
      ],
      firstCard: c('4h'),
    });

    log('p2 tries 8♣ (no match — 4♥ on discard)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('8c') });
    expect(r1.ok).toBe(false);

    log('Verify: rejected — card does not match house');
  });
});
