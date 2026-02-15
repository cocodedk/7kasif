import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('9♦ — consecutive 9♦ plays', () => {
  it('should apply the all-others-draw effect each time', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('9d'), c('Kc')],
        [c('9d'), c('Qh')],  // second 9♦ (same value match)
      ],
      firstCard: c('4d'),
      remainingDeck: [c('Jh'), c('5c'), c('8s'), c('3c')],
    });

    log('p2 plays 9♦');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('9d') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: p1 and p3 each drew 1 card');
    let p1 = r1.newState.players.find(p => p.id === 'p1')!;
    let p3 = r1.newState.players.find(p => p.id === 'p3')!;
    expect(p1.hand.length).toBe(3);
    expect(p3.hand.length).toBe(3);

    log('p3 plays 9♦ (matches value)');
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('9d') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: p1 drew again (now 4), p2 drew 1 (now 2)');
    p1 = r2.newState.players.find(p => p.id === 'p1')!;
    const p2 = r2.newState.players.find(p => p.id === 'p2')!;
    expect(p1.hand.length).toBe(4); // 3 + 1
    expect(p2.hand.length).toBe(2); // 1 + 1
  });
});
