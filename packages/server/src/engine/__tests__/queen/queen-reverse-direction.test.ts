import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Queen — in reverse direction', () => {
  it('should advance turn correctly when direction is reversed', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Qd'), c('9c')],
        [c('Ks'), c('3h')],
      ],
      firstCard: c('4d'),
      direction: -1,
    });

    log('Direction reversed (-1), p2 plays Q♦');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Qd') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: turn goes to p1 (counter-clockwise from p2)');
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p1');

    log('Verify: pendingEffect targets p1');
    expect(r1.newState.pendingEffect).toEqual({ type: 'queen-reveal', targetPlayerId: 'p1' });
  });
});
