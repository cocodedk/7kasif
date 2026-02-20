import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Two — no suit or value match rejected', () => {
  it('should reject 2 that does not match discard by suit or value', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],  // p1
        [c('2c'), c('9h')],  // p2 — 2♣ has no match with 4♦ (different suit, different value)
        [c('6h'), c('Ks')],  // p3
      ],
      firstCard: c('4d'),
      currentPlayerIndex: 1,
    });

    log('p2 tries to play 2♣ on 4♦ (no suit or value match)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('2c'), giveCard: c('9h') });
    expect(r1.ok).toBe(false);
    if (r1.ok) return;
    log('Verify: action rejected');
  });
});
