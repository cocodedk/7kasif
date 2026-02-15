import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Ten — three players wrap in reverse', () => {
  it('should wrap correctly when reverse crosses player 0 boundary', () => {
    const state = createTestState({
      hands: [
        [c('10d'), c('5s')],
        [c('Ks'), c('9c')],
        [c('Kh'), c('Qh')],
      ],
      firstCard: c('4d'),
      currentPlayerIndex: 0,
    });

    log('p1 plays 10♦ — reverses direction');
    const r1 = applyAction(state, 'p1', { type: 'PLAY_CARD', card: c('10d') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: direction is -1');
    expect(r1.newState.direction).toBe(-1);

    log('Verify: turn wraps to p3 (counter-clockwise from p1)');
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p3');
  });
});
