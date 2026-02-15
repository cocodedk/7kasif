import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Jack — in reverse direction', () => {
  it('should enforce declared suit on correct next player when reversed', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Jc'), c('9h')],
        [c('3h'), c('Ks')],
      ],
      firstCard: c('4d'),
      direction: -1,
    });

    log('Direction is reversed (-1), p2 plays J♣ declaring hearts');
    const r1 = applyAction(state, 'p2', {
      type: 'PLAY_CARD',
      card: c('Jc'),
      declaredSuit: 'hearts',
    });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: turn goes to p1 (counter-clockwise from p2)');
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p1');

    log('p1 tries 4♠ (doesn\'t match declared hearts)');
    const r2 = applyAction(r1.newState, 'p1', { type: 'PLAY_CARD', card: c('4s') });
    expect(r2.ok).toBe(false);

    log('Verify: rejected — declared suit enforced on p1');
  });
});
