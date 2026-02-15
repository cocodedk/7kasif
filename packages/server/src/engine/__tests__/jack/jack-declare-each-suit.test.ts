import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Jack — can declare any of the four suits', () => {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const;

  for (const suit of suits) {
    it(`should allow declaring ${suit}`, () => {
      const state = createTestState({
        hands: [
          [c('4s'), c('5s')],
          [c('Jc'), c('9h')],
          [c('Ks'), c('Qh')],
        ],
        firstCard: c('4d'),
      });

      log(`p2 plays J♣ declaring ${suit}`);
      const r1 = applyAction(state, 'p2', {
        type: 'PLAY_CARD',
        card: c('Jc'),
        declaredSuit: suit,
      });
      expect(r1.ok).toBe(true);
      if (!r1.ok) return;

      log(`Verify: HOUSE_CHANGED to ${suit}`);
      const houseEvent = r1.events.find(e => e.type === 'HOUSE_CHANGED');
      expect(houseEvent).toBeDefined();
      expect(houseEvent!.newSuit).toBe(suit);
    });
  }
});
