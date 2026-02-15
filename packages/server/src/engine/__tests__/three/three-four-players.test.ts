import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Three — four players', () => {
  it('should make correct previous player draw in 4-player game', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],       // p1
        [c('3d'), c('9c')],       // p2
        [c('6d'), c('Ks')],       // p3
        [c('Qh'), c('2c')],       // p4
      ],
      firstCard: c('4d'),
      remainingDeck: [c('5c')],
    });

    log('p2 plays 3♦ in 4-player game');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('3d') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: p1 (previous of p2) drew 1 card');
    const p1 = r1.newState.players.find(p => p.id === 'p1')!;
    expect(p1.hand.length).toBe(3);

    log('Verify: p3 and p4 unaffected');
    const p3 = r1.newState.players.find(p => p.id === 'p3')!;
    const p4 = r1.newState.players.find(p => p.id === 'p4')!;
    expect(p3.hand.length).toBe(2);
    expect(p4.hand.length).toBe(2);

    log('Verify: turn advances to p3');
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p3');
  });

  it('should wrap around — p1 plays 3, previous is p4', () => {
    const state = createTestState({
      hands: [
        [c('3d'), c('5s')],       // p1
        [c('4h'), c('9c')],       // p2
        [c('6d'), c('Ks')],       // p3
        [c('Qh'), c('2c')],       // p4
      ],
      firstCard: c('4d'),
      currentPlayerIndex: 0,       // p1's turn
      remainingDeck: [c('5c')],
    });

    log('p1 plays 3♦ — previous player wraps to p4');
    const r1 = applyAction(state, 'p1', { type: 'PLAY_CARD', card: c('3d') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: p4 drew 1 card');
    const p4 = r1.newState.players.find(p => p.id === 'p4')!;
    expect(p4.hand.length).toBe(3);

    log('Verify: p2 and p3 unaffected');
    const p2 = r1.newState.players.find(p => p.id === 'p2')!;
    expect(p2.hand.length).toBe(2);
  });
});
