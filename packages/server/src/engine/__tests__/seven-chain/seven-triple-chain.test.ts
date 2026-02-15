import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Seven — triple chain', () => {
  it('should accumulate penalty to 6 across three 7s', () => {
    const state = createTestState({
      hands: [
        [c('7c'), c('5s')],
        [c('7h'), c('9c')],
        [c('7d'), c('Ks')],
      ],
      firstCard: c('4h'),
      remainingDeck: [c('Qd'), c('2c'), c('3s'), c('4d'), c('5d'), c('6s')],
    });

    // p2 plays 7h
    log('p2 plays 7♥');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    // p3 counters with 7d
    log('p3 counters with 7♦');
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('7d') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: penalty=4');
    expect((r2.newState.pendingEffect as any)?.penalty).toBe(4);

    // p1 counters with 7c
    log('p1 counters with 7♣');
    const r3 = applyAction(r2.newState, 'p1', { type: 'PLAY_CARD', card: c('7c') });
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;

    log('Verify: penalty=6, back to p2');
    expect((r3.newState.pendingEffect as any)?.penalty).toBe(6);
    // Back to p2
    expect(r3.newState.players[r3.newState.currentPlayerIndex].id).toBe('p2');
  });
});
