import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Six — match by value', () => {
  it('should allow playing 6 that matches by value (different suit)', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('6c'), c('9h')],
        [c('Ks'), c('Qh')],
      ],
      firstCard: c('6d'),         // top card is 6♦
      remainingDeck: [c('Jh'), c('5c')],
    });

    log('p2 plays 6♣ (matches value of 6♦ on discard)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('6c') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: p3 drew 1 card');
    const p3 = r1.newState.players.find(p => p.id === 'p3')!;
    expect(p3.hand.length).toBe(3);

    log('Verify: p1 (next 2) drew 1 card');
    const p1 = r1.newState.players.find(p => p.id === 'p1')!;
    expect(p1.hand.length).toBe(3);
  });
});
