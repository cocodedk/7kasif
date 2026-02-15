import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Three — reverse direction changes previous player', () => {
  it('should target the correct previous player when direction is reversed', () => {
    // Direction=-1: play order is p1←p3←p2←p1 (counter-clockwise)
    // "Previous" with direction=-1 and steps=-1: direction*steps = (-1)*(-1) = +1
    // So previous of p2 (idx 1) = idx (1+1)%3 = 2 = p3
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],       // p1
        [c('3h'), c('9c')],       // p2
        [c('6d'), c('Ks')],       // p3
      ],
      firstCard: c('4h'),
      direction: -1,
      currentPlayerIndex: 1,       // p2's turn
      remainingDeck: [c('Qd')],
    });

    log('Direction is reversed (-1), p2 plays 3♥');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('3h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: p3 (previous in reversed direction) drew 1 card');
    const p3 = r1.newState.players.find(p => p.id === 'p3')!;
    expect(p3.hand.length).toBe(3); // 2 + 1 drawn

    log('Verify: p1 did NOT draw (not previous in this direction)');
    const p1 = r1.newState.players.find(p => p.id === 'p1')!;
    expect(p1.hand.length).toBe(2); // unchanged
  });
});
