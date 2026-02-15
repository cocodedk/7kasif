import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Eight — wrong suit during seven-chain rejected (standard)', () => {
  it('should reject 8 of wrong suit during seven-chain in standard mode', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7h'), c('9c')],
        [c('8c'), c('Ks')],
      ],
      firstCard: c('4h'),
    });

    log('p2 plays 7♥ to start chain');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 tries 8♣ during seven-chain (wrong suit, standard mode)');
    const r2 = applyAction(r1.newState, 'p3', {
      type: 'PLAY_CARD',
      card: c('8c'),
      chainChoice: 'redirect',
    });
    expect(r2.ok).toBe(false);

    log('Verify: rejected — must match chain suit in standard mode');
  });
});
