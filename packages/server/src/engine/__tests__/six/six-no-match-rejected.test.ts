import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Six — no match rejected', () => {
  it('should reject 6 that does not match suit or value', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('6c'), c('9h')],
        [c('Ks'), c('Qh')],
      ],
      firstCard: c('4h'),         // hearts/4 — 6♣ matches neither
    });

    log('p2 tries 6♣ (no match — 4♥ on discard)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('6c') });
    expect(r1.ok).toBe(false);
    if (r1.ok) return;

    log('Verify: rejected — card does not match house');
    expect(r1.reason).toContain('does not match');
  });
});
