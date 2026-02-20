import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Challenge — unannounced 1-card player draws 1 penalty card', () => {
  it('should give p2 a penalty card when challenged without announcing', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('4d'), c('9c')],
        [c('9s'), c('Ks')],
      ],
      firstCard: c('4h'),
      remainingDeck: [c('Qd')],
    });

    log('p2 plays 4d (matches suit of 4h), going down to 1 card, does not announce');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('4d') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p1 challenges p2 with CHALLENGE_NO_ANNOUNCEMENT');
    const r2 = applyAction(r1.newState, 'p1', {
      type: 'CHALLENGE_NO_ANNOUNCEMENT',
      targetPlayerId: 'p2',
    });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: p2 drew 1 penalty card and now has 2 cards');
    const p2 = r2.newState.players.find(p => p.id === 'p2')!;
    expect(p2.hand.length).toBe(2);
  });
});
