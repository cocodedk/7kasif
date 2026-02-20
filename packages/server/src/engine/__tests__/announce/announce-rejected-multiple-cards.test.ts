import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Announce — player with >1 card tries to announce', () => {
  it('should reject ANNOUNCE_ONE_CARD when player still has 2 cards', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('4d'), c('9c'), c('3s')],
        [c('9s'), c('Ks')],
      ],
      firstCard: c('4h'),
    });

    log('p2 plays 4d (matches suit of 4h), going down to 2 cards');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('4d') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p2 tries ANNOUNCE_ONE_CARD but still has 2 cards');
    const r2 = applyAction(r1.newState, 'p2', { type: 'ANNOUNCE_ONE_CARD' });

    log('Verify: action is rejected');
    expect(r2.ok).toBe(false);
  });
});
