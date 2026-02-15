import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Seven — draw penalty with deck recycle', () => {
  it('should recycle discard pile when deck runs out during penalty draw', () => {
    // Set up state with a pre-existing seven-chain so we don't need to play a 7 first
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7d'), c('Ks')],       // p2
        [c('6d'), c('9c')],       // p3
      ],
      firstCard: c('7h'),         // 7h on discard
      remainingDeck: [c('Qd'), c('2c')], // only 2 cards in deck
      currentPlayerIndex: 1,
      pendingEffect: { type: 'seven-chain', penalty: 4, suit: 'hearts' },
    });

    // Add extra cards to discard pile for recycling
    state.discardPile.push(c('3s'), c('6s'), c('5d'));

    log('p2 draws 4 cards (deck has only 2, discard recycling needed)');
    const r1 = applyAction(state, 'p2', { type: 'DRAW_CARD' });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: p2 has 6 cards total (2 original + 4 drawn), pending effect cleared');
    const p2 = r1.newState.players.find(p => p.id === 'p2')!;
    // Should have drawn 4 total (2 from deck + 2 from recycled discard)
    expect(p2.hand.length).toBe(6); // 2 original + 4 drawn
    expect(r1.newState.pendingEffect).toBeNull();
    // Discard pile should have at least the top card remaining
    expect(r1.newState.discardPile.length).toBeGreaterThanOrEqual(1);
  });

  it('should handle drawing penalty when deck has exactly enough cards', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7h'), c('9c')],
        [c('6d'), c('Ks')],
      ],
      firstCard: c('4h'),
      remainingDeck: [c('Qd'), c('2c')],
    });

    log('p2 plays 7♥ (penalty +2)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 draws 2 cards (deck has exactly 2)');
    const r2 = applyAction(r1.newState, 'p3', { type: 'DRAW_CARD' });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: p3 has 4 cards total (2 original + 2 drawn)');
    const p3 = r2.newState.players.find(p => p.id === 'p3')!;
    expect(p3.hand.length).toBe(4); // 2 + 2
  });
});
