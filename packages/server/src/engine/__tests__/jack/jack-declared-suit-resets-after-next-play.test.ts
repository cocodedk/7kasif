import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Jack — declared suit resets after next play', () => {
  it('should not enforce declared suit after a non-Jack card is played', () => {
    const state = createTestState({
      hands: [
        [c('6d'), c('5s')],
        [c('Jc'), c('9h')],
        [c('6h'), c('Ks')],
      ],
      firstCard: c('4d'),
    });

    log('p2 plays J♣ declaring hearts');
    const r1 = applyAction(state, 'p2', {
      type: 'PLAY_CARD',
      card: c('Jc'),
      declaredSuit: 'hearts',
    });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 plays 6♥ (matches declared hearts)');
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('6h') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('p1 plays 6♦ (matches value of 6♥, not hearts suit)');
    const r3 = applyAction(r2.newState, 'p1', { type: 'PLAY_CARD', card: c('6d') });
    expect(r3.ok).toBe(true);

    log('Verify: accepted — declared suit no longer enforced after p3 played');
  });
});
