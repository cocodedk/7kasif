import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Queen — match by value', () => {
  it('should allow Queen matching value of Queen on discard', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Qc'), c('9h')],
        [c('Ks'), c('3h')],
      ],
      firstCard: c('Qd'),
    });

    log('p2 plays Q♣ (matches value of Q♦ on discard)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Qc') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: turn advances to p3');
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p3');

    log('Verify: pendingEffect set for queen-reveal');
    expect(r1.newState.pendingEffect).toEqual({ type: 'queen-reveal', targetPlayerId: 'p3' });
  });
});
