import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Seven — 8 add', () => {
  it('should add 3 to penalty and continue chain', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7h'), c('9c')],
        [c('8h'), c('Ks')],
        [c('3c'), c('6d')],
      ],
      firstCard: c('4h'),
    });

    log('p2 plays 7♥');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    // p3 adds with 8h
    log('p3 plays 8♥ (add)');
    const r2 = applyAction(r1.newState, 'p3', {
      type: 'PLAY_CARD',
      card: c('8h'),
      chainChoice: 'add',
    });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    // Penalty: 2 + 3 = 5
    log('Verify: penalty=5, chain continues to p4');
    expect(r2.newState.pendingEffect).toEqual({
      type: 'seven-chain',
      penalty: 5,
      suit: 'hearts',
    });
    // Chain continues — turn to p4
    expect(r2.newState.players[r2.newState.currentPlayerIndex].id).toBe('p4');
  });
});
