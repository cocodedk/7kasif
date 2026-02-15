import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Six — four players', () => {
  it('should only affect the next two players, not all others', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],       // p1
        [c('6d'), c('9c')],       // p2
        [c('Ks'), c('Qh')],       // p3
        [c('3c'), c('2h')],       // p4
      ],
      firstCard: c('4d'),
      remainingDeck: [c('Jh'), c('5c')],
    });

    log('p2 plays 6♦ in 4-player game');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('6d') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: p3 (next 1) drew 1 card');
    const p3 = r1.newState.players.find(p => p.id === 'p3')!;
    expect(p3.hand.length).toBe(3);

    log('Verify: p4 (next 2) drew 1 card');
    const p4 = r1.newState.players.find(p => p.id === 'p4')!;
    expect(p4.hand.length).toBe(3);

    log('Verify: p1 NOT affected (next 3, not targeted)');
    const p1 = r1.newState.players.find(p => p.id === 'p1')!;
    expect(p1.hand.length).toBe(2);

    log('Verify: turn advances to p3');
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p3');
  });
});
