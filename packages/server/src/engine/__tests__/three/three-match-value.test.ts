import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Three — match by value', () => {
  it('should allow playing 3 that matches by value (different suit)', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],       // p1
        [c('3c'), c('9h')],       // p2
        [c('6d'), c('Ks')],       // p3
      ],
      firstCard: c('3d'),         // top card is 3♦
      remainingDeck: [c('Qh')],
    });

    log('p2 plays 3♣ (matches value of 3♦ on discard)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('3c') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: p1 drew 1 card');
    const p1 = r1.newState.players.find(p => p.id === 'p1')!;
    expect(p1.hand.length).toBe(3);

    log('Verify: turn advances to p3');
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p3');
  });
});
