import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Seven — two 7s then draw 4', () => {
  it('should draw 4 cards when accepting a penalty of 4', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7h'), c('9c')],
        [c('7d'), c('Ks')],
      ],
      firstCard: c('4h'),
      remainingDeck: [c('Qd'), c('2c'), c('3s'), c('6s')],
    });

    log('p2 plays 7♥');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 plays 7♦');
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('7d') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    // p1 accepts penalty of 4
    log('p1 draws (accepts penalty=4)');
    const r3 = applyAction(r2.newState, 'p1', { type: 'DRAW_CARD' });
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;

    const p1 = r3.newState.players.find(p => p.id === 'p1')!;
    log('Verify: p1 has 6 cards, chain ended');
    expect(p1.hand.length).toBe(6); // 2 original + 4 drawn
    expect(r3.newState.pendingEffect).toBeNull();
  });
});
