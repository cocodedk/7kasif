import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Ten — match by value', () => {
  it('should allow playing 10 that matches by value (different suit)', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('10c'), c('9h')],
        [c('Ks'), c('Qh')],
      ],
      firstCard: c('10d'),
    });

    log('p2 plays 10♣ (matches value of 10♦ on discard)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('10c') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: direction reversed');
    expect(r1.newState.direction).toBe(-1);

    log('Verify: turn goes to p1 (counter-clockwise)');
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p1');
  });
});
