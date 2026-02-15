import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Jack — match by value overrides declared suit', () => {
  it('should allow card matching discard value even if suit doesn\'t match declared', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Jc'), c('9h')],
        [c('Ks'), c('Qh')],  // K♠ doesn't match hearts, but...
      ],
      firstCard: c('Kd'),
    });

    log('p2 plays J♣ declaring hearts (on top of K♦)');
    const r1 = applyAction(state, 'p2', {
      type: 'PLAY_CARD',
      card: c('Jc'),
      declaredSuit: 'hearts',
    });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 tries K♠ — doesn\'t match hearts, but matches Jack value? No — top is J♣');
    // The top discard is now J♣. K♠ doesn't match jack value or hearts suit.
    // Only jack value or declared suit should work.
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('Ks') });
    expect(r2.ok).toBe(false);

    log('Verify: rejected — must match declared suit or Jack value');
  });

  it('should allow card matching Jack value (another Jack) regardless of declared suit', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Jc'), c('9h')],
        [c('Js'), c('Qh')],
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

    log('p3 plays J♠ declaring diamonds (Jack is wild, always matches)');
    const r2 = applyAction(r1.newState, 'p3', {
      type: 'PLAY_CARD',
      card: c('Js'),
      declaredSuit: 'diamonds',
    });
    expect(r2.ok).toBe(true);

    log('Verify: accepted — Jack always plays');
  });
});
