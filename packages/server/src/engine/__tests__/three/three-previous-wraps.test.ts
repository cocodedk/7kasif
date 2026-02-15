import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Three — previous player wraps around', () => {
  it('should wrap to last player when first player plays 3', () => {
    const state = createTestState({
      hands: [
        [c('3d'), c('5s')],       // p1
        [c('4h'), c('9c')],       // p2
        [c('6d'), c('Ks')],       // p3
      ],
      firstCard: c('4d'),
      currentPlayerIndex: 0,       // p1's turn
      remainingDeck: [c('Qh')],
    });

    log('p1 plays 3♦ — previous wraps to p3');
    const r1 = applyAction(state, 'p1', { type: 'PLAY_CARD', card: c('3d') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: p3 (wraps as previous of p1) drew 1 card');
    const p3 = r1.newState.players.find(p => p.id === 'p3')!;
    expect(p3.hand.length).toBe(3); // 2 + 1

    log('Verify: p2 unaffected');
    const p2 = r1.newState.players.find(p => p.id === 'p2')!;
    expect(p2.hand.length).toBe(2);

    log('Verify: turn advances to p2');
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p2');
  });
});
