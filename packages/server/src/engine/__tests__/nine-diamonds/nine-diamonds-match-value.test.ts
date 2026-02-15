import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('9♦ — match by value', () => {
  it('should allow playing 9♦ matching value of 9 on discard', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('9d'), c('Kc')],
        [c('Ks'), c('Qh')],
      ],
      firstCard: c('9h'),
      remainingDeck: [c('Jh'), c('5c')],
    });

    log('p2 plays 9♦ (matches value of 9♥ on discard)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('9d') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: p1 drew 1 card (9♦ effect fires)');
    const p1 = r1.newState.players.find(p => p.id === 'p1')!;
    expect(p1.hand.length).toBe(3);

    log('Verify: p3 drew 1 card');
    const p3 = r1.newState.players.find(p => p.id === 'p3')!;
    expect(p3.hand.length).toBe(3);
  });
});
