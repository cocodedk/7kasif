import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('9♦ — four players all draw', () => {
  it('should make all 3 other players draw 1 card each', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('9d'), c('Kc')],
        [c('Ks'), c('Qh')],
        [c('3h'), c('2s')],
      ],
      firstCard: c('4d'),
      remainingDeck: [c('Jh'), c('5c'), c('8s')],
    });

    log('p2 plays 9♦ in 4-player game');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('9d') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: p1 drew 1 card (now 3)');
    const p1 = r1.newState.players.find(p => p.id === 'p1')!;
    expect(p1.hand.length).toBe(3);

    log('Verify: p3 drew 1 card (now 3)');
    const p3 = r1.newState.players.find(p => p.id === 'p3')!;
    expect(p3.hand.length).toBe(3);

    log('Verify: p4 drew 1 card (now 3)');
    const p4 = r1.newState.players.find(p => p.id === 'p4')!;
    expect(p4.hand.length).toBe(3);

    log('Verify: p2 did NOT draw (only played)');
    const p2 = r1.newState.players.find(p => p.id === 'p2')!;
    expect(p2.hand.length).toBe(1);
  });
});
