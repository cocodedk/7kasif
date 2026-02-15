import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Ten — four players direction change', () => {
  it('should reverse and advance correctly in 4-player game', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('10d'), c('9c')],
        [c('Ks'), c('Qh')],
        [c('3h'), c('2s')],
      ],
      firstCard: c('4d'),
    });

    log('p2 plays 10♦ in 4-player game');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('10d') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: direction reversed to -1');
    expect(r1.newState.direction).toBe(-1);

    log('Verify: turn goes to p1 (counter-clockwise from p2)');
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p1');
  });

  it('should wrap correctly in reverse from p1', () => {
    const state = createTestState({
      hands: [
        [c('10d'), c('5s')],
        [c('Ks'), c('9c')],
        [c('Kh'), c('Qh')],
        [c('3h'), c('2s')],
      ],
      firstCard: c('4d'),
      currentPlayerIndex: 0,
    });

    log('p1 plays 10♦ — reverse from p1');
    const r1 = applyAction(state, 'p1', { type: 'PLAY_CARD', card: c('10d') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: turn goes to p4 (counter-clockwise wraps from p1)');
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p4');
  });
});
