import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('9♦ — basic all others draw', () => {
  it('should make every other player draw 1 card', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('9d'), c('Kc')],
        [c('Ks'), c('Qh')],
      ],
      firstCard: c('4d'),
      remainingDeck: [c('Jh'), c('5c')],
    });

    log('p2 plays 9♦ (matches suit of 4♦)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('9d') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: p1 drew 1 card');
    const p1 = r1.newState.players.find(p => p.id === 'p1')!;
    expect(p1.hand.length).toBe(3);

    log('Verify: p3 drew 1 card');
    const p3 = r1.newState.players.find(p => p.id === 'p3')!;
    expect(p3.hand.length).toBe(3);

    log('Verify: p2 did NOT draw');
    const p2 = r1.newState.players.find(p => p.id === 'p2')!;
    expect(p2.hand.length).toBe(1); // played 9d, only Kc left

    log('Verify: turn advances to p3');
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p3');
  });
});
