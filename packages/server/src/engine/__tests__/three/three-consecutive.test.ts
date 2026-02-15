import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Three — consecutive 3s by different players', () => {
  it('should apply draw effect each time a 3 is played', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],       // p1
        [c('3d'), c('9c')],       // p2
        [c('3c'), c('Ks')],       // p3 — matches 3 by value
      ],
      firstCard: c('4d'),
      remainingDeck: [c('Qh'), c('2s'), c('5c')],
    });

    log('p2 plays 3♦');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('3d') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: p1 drew 1 card (now 3 cards)');
    let p1 = r1.newState.players.find(p => p.id === 'p1')!;
    expect(p1.hand.length).toBe(3);

    log('p3 plays 3♣ (matches value of 3♦)');
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('3c') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: p2 (previous of p3) drew 1 card (now 2 cards)');
    const p2 = r2.newState.players.find(p => p.id === 'p2')!;
    expect(p2.hand.length).toBe(2); // had 1 (9c), drew 1

    log('Verify: p1 unaffected by second 3 (still 3 cards)');
    p1 = r2.newState.players.find(p => p.id === 'p1')!;
    expect(p1.hand.length).toBe(3); // unchanged from first draw

    log('Verify: turn advances to p1');
    expect(r2.newState.players[r2.newState.currentPlayerIndex].id).toBe('p1');
  });
});
