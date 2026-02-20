import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Challenge — challenge player with >1 card is rejected', () => {
  it('should reject challenge when target has more than 1 card', () => {
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

    log('p1 tries CHALLENGE_NO_ANNOUNCEMENT targeting p2 who has 2 cards');
    const r2 = applyAction(r1.newState, 'p1', {
      type: 'CHALLENGE_NO_ANNOUNCEMENT',
      targetPlayerId: 'p2',
    });

    log('Verify: challenge is rejected because p2 has >1 card');
    expect(r2.ok).toBe(false);
  });
});
