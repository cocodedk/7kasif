import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Six — three players wrap around', () => {
  it('should wrap around so both other players draw in 3-player game', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],       // p1
        [c('6d'), c('9c')],       // p2
        [c('Ks'), c('Qh')],       // p3
      ],
      firstCard: c('4d'),
      remainingDeck: [c('Jh'), c('5c')],
    });

    log('p2 plays 6♦ in 3-player game');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('6d') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: p3 (next 1) drew 1 card');
    const p3 = r1.newState.players.find(p => p.id === 'p3')!;
    expect(p3.hand.length).toBe(3);

    log('Verify: p1 (next 2, wraps around) drew 1 card');
    const p1 = r1.newState.players.find(p => p.id === 'p1')!;
    expect(p1.hand.length).toBe(3);
  });

  it('should work when p3 plays — next two are p1 and p2', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],       // p1
        [c('9d'), c('9c')],       // p2
        [c('6d'), c('Qh')],       // p3
      ],
      firstCard: c('4d'),
      currentPlayerIndex: 2,       // p3's turn
      remainingDeck: [c('Jh'), c('5c')],
    });

    log('p3 plays 6♦ — next two wrap to p1 and p2');
    const r1 = applyAction(state, 'p3', { type: 'PLAY_CARD', card: c('6d') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: p1 drew 1 card');
    const p1 = r1.newState.players.find(p => p.id === 'p1')!;
    expect(p1.hand.length).toBe(3);

    log('Verify: p2 drew 1 card');
    const p2 = r1.newState.players.find(p => p.id === 'p2')!;
    expect(p2.hand.length).toBe(3);
  });
});
