import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Queen — consecutive Queens', () => {
  it('should allow consecutive Queens by value match', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Qd'), c('9c')],
        [c('Qh'), c('Ks'), c('3c')],  // 3 cards so queen can still be unrevealed
      ],
      firstCard: c('4d'),
    });

    log('p2 plays Q♦ (matches suit)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Qd') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    // Check if Q♥ was the revealed card
    const p3 = r1.newState.players.find(p => p.id === 'p3')!;
    const qhRevealed = p3.revealedCards.some(
      rc => rc.value === 'queen' && rc.suit === 'hearts',
    );

    if (qhRevealed) {
      log('Q♥ was revealed — p3 cannot play it this turn (expected)');
      const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('Qh') });
      expect(r2.ok).toBe(false);
    } else {
      log('Q♥ was NOT revealed — p3 plays Q♥ (matches value of Q♦)');
      const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('Qh') });
      expect(r2.ok).toBe(true);
      if (!r2.ok) return;

      log('Verify: turn advances to p1');
      expect(r2.newState.players[r2.newState.currentPlayerIndex].id).toBe('p1');
    }
  });
});
