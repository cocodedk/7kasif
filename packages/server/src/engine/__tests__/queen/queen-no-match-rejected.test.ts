import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Queen — no match rejected', () => {
  it('should reject Queen that does not match suit or value', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Qc'), c('9h')],
        [c('Ks'), c('3h')],
      ],
      firstCard: c('4h'),
    });

    log('p2 tries Q♣ (no match — 4♥ on discard)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Qc') });
    expect(r1.ok).toBe(false);

    log('Verify: rejected — card does not match house');
  });
});
