import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Six — reverse direction changes targets', () => {
  it('should target correct next two players when direction is reversed', () => {
    // Direction=-1, p2 (idx 1) plays 6
    // next1 = nextPlayerIndex(1, 1) with dir=-1 → idx (1 + (-1)*1) = 0 → p1
    // next2 = nextPlayerIndex(1, 2) with dir=-1 → idx (1 + (-1)*2) = -1 → wraps to p3 (idx 2)
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],       // p1
        [c('6h'), c('9c')],       // p2
        [c('Ks'), c('Qd')],       // p3
      ],
      firstCard: c('4h'),
      direction: -1,
      currentPlayerIndex: 1,
      remainingDeck: [c('Jh'), c('5c')],
    });

    log('Direction reversed (-1), p2 plays 6♥');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('6h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: p1 (next 1 in reverse) drew 1 card');
    const p1 = r1.newState.players.find(p => p.id === 'p1')!;
    expect(p1.hand.length).toBe(3);

    log('Verify: p3 (next 2 in reverse) drew 1 card');
    const p3 = r1.newState.players.find(p => p.id === 'p3')!;
    expect(p3.hand.length).toBe(3);
  });
});
