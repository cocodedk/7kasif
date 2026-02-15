import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Six — deck low during double draw', () => {
  it('should handle deck with only 1 card when 2 draws needed', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('6d'), c('9c')],
        [c('Ks'), c('Qh')],
      ],
      firstCard: c('4d'),
      remainingDeck: [c('Jh')],   // only 1 card
    });
    // After 6d is played, discard = [4d, 6d]
    // First draw: p3 gets Jh from deck (deck now empty)
    // Second draw: deck empty → reshuffle discard (4d goes to deck, 6d stays as top)
    // p1 draws 4d

    log('p2 plays 6♦ with only 1 card in deck');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('6d') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: p3 drew 1 card');
    const p3 = r1.newState.players.find(p => p.id === 'p3')!;
    expect(p3.hand.length).toBe(3);

    log('Verify: p1 drew 1 card (from recycled discard)');
    const p1 = r1.newState.players.find(p => p.id === 'p1')!;
    expect(p1.hand.length).toBe(3);
  });

  it('should handle deck with exactly 2 cards for both draws', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('6d'), c('9c')],
        [c('Ks'), c('Qh')],
      ],
      firstCard: c('4d'),
      remainingDeck: [c('Jh'), c('5c')],
    });
    // Deck has 2 cards, one per draw — no recycling needed

    log('p2 plays 6♦ with exactly 2 cards in deck');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('6d') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: p3 drew 1 card');
    const p3 = r1.newState.players.find(p => p.id === 'p3')!;
    expect(p3.hand.length).toBe(3);

    log('Verify: p1 drew 1 card');
    const p1 = r1.newState.players.find(p => p.id === 'p1')!;
    expect(p1.hand.length).toBe(3);

    log('Verify: deck is now empty');
    expect(r1.newState.deck.length).toBe(0);
  });
});
