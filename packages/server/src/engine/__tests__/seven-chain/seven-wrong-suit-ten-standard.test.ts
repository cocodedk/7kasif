import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Seven — wrong suit 10 in standard mode', () => {
  it('should reject 10 of different suit in standard mode', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7h'), c('9c')],
        [c('10c'), c('Ks')],
      ],
      firstCard: c('4h'),
      mode: 'standard',
    });

    log('p2 plays 7♥');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 tries to play 10♣ (wrong suit, should be rejected in standard)');
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('10c') });
    log('Verify: action rejected — 10 suit must match chain suit in standard');
    expect(r2.ok).toBe(false);
  });
});
