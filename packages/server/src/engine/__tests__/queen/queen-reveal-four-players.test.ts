import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Queen — only next player affected in 4-player game', () => {
  it('should only reveal a card from the next player, not others', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],       // p1
        [c('Qd'), c('9c')],       // p2
        [c('6d'), c('Ks')],       // p3
        [c('7h'), c('8c')],       // p4
      ],
      firstCard: c('4d'),
    });

    log('p2 plays Q♦');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Qd') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: only p3 (next player) has a revealed card');
    const p1 = r1.newState.players.find(p => p.id === 'p1')!;
    const p2 = r1.newState.players.find(p => p.id === 'p2')!;
    const p3 = r1.newState.players.find(p => p.id === 'p3')!;
    const p4 = r1.newState.players.find(p => p.id === 'p4')!;

    expect(p1.revealedCards.length).toBe(0);
    expect(p2.revealedCards.length).toBe(0);
    expect(p3.revealedCards.length).toBe(1);
    expect(p4.revealedCards.length).toBe(0);
  });
});
