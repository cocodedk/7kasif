import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Ten — basic reverse direction', () => {
  it('should reverse direction from clockwise to counter-clockwise', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('10d'), c('9c')],
        [c('Ks'), c('Qh')],
      ],
      firstCard: c('4d'),
    });

    log('Direction starts at 1 (clockwise)');
    expect(state.direction).toBe(1);

    log('p2 plays 10♦');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('10d') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: direction reversed to -1');
    expect(r1.newState.direction).toBe(-1);

    log('Verify: DIRECTION_REVERSED event');
    const revEvent = r1.events.find(e => e.type === 'DIRECTION_REVERSED');
    expect(revEvent).toBeDefined();

    log('Verify: turn goes to p1 (counter-clockwise from p2)');
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p1');
  });
});
