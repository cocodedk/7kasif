import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Ten — double reverse restores direction', () => {
  it('should restore original direction after two 10s are played', () => {
    const state = createTestState({
      hands: [
        [c('10h'), c('5s')],
        [c('10d'), c('9c')],
        [c('Ks'), c('Qh')],
      ],
      firstCard: c('4d'),
      currentPlayerIndex: 1,
    });

    log('Direction starts at 1 (clockwise)');
    expect(state.direction).toBe(1);

    log('p2 plays 10♦ — reverses to -1');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('10d') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    expect(r1.newState.direction).toBe(-1);

    log('Turn goes to p1 (counter-clockwise)');
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p1');

    log('p1 plays 10♥ (matches value) — reverses back to 1');
    const r2 = applyAction(r1.newState, 'p1', { type: 'PLAY_CARD', card: c('10h') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: direction restored to 1 (clockwise)');
    expect(r2.newState.direction).toBe(1);

    log('Verify: turn goes to p2 (clockwise from p1)');
    expect(r2.newState.players[r2.newState.currentPlayerIndex].id).toBe('p2');
  });
});
