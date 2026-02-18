import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Draw — deck reshuffle emits event', () => {
  it('should emit DECK_RESHUFFLED event when deck runs out and discard is reshuffled', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],       // p1
        [c('9c'), c('Ks')],       // p2
      ],
      firstCard: c('3h'),
      currentPlayerIndex: 0,
    });

    // Force empty deck and add cards to discard so reshuffle has material
    state.deck = [];
    state.discardPile.push(c('6d'), c('7d'), c('8d'));

    log('p1 draws with empty deck — should trigger reshuffle');
    const r1 = applyAction(state, 'p1', { type: 'DRAW_CARD' });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: DECK_RESHUFFLED event emitted');
    const reshuffleEvent = r1.events.find(e => e.type === 'DECK_RESHUFFLED');
    expect(reshuffleEvent).toBeDefined();

    log('Verify: CARD_DRAWN event also emitted');
    const drawEvent = r1.events.find(e => e.type === 'CARD_DRAWN');
    expect(drawEvent).toBeDefined();
  });

  it('should NOT emit DECK_RESHUFFLED when deck still has cards', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],       // p1
        [c('9c'), c('Ks')],       // p2
      ],
      firstCard: c('3h'),
      currentPlayerIndex: 0,
    });

    log('p1 draws with cards in deck — no reshuffle');
    const r1 = applyAction(state, 'p1', { type: 'DRAW_CARD' });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    const reshuffleEvent = r1.events.find(e => e.type === 'DECK_RESHUFFLED');
    expect(reshuffleEvent).toBeUndefined();
  });
});
