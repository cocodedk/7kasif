import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Queen — four players turn advance', () => {
  it('should advance turn normally in 4-player game', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Qd'), c('9c')],
        [c('Ks'), c('3h')],
        [c('6c'), c('2s')],
      ],
      firstCard: c('4d'),
    });

    log('p2 plays Q♦ in 4-player game');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Qd') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: turn goes to p3 (next player)');
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p3');
  });

  it('should wrap around from last player to first', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Ks'), c('9c')],
        [c('Kh'), c('3h')],
        [c('Qd'), c('2s')],
      ],
      firstCard: c('4d'),
      currentPlayerIndex: 3,
    });

    log('p4 plays Q♦ — turn wraps to p1');
    const r1 = applyAction(state, 'p4', { type: 'PLAY_CARD', card: c('Qd') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: turn goes to p1');
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p1');
  });
});
