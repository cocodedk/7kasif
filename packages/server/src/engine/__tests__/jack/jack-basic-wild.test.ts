import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Jack — basic wild play', () => {
  it('should allow Jack on any discard regardless of suit or value', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Jc'), c('9h')],
        [c('Ks'), c('Qh')],
      ],
      firstCard: c('4d'),
    });

    log('p2 plays J♣ declaring spades (no suit/value match with 4♦, but Jack is wild)');
    const r1 = applyAction(state, 'p2', {
      type: 'PLAY_CARD',
      card: c('Jc'),
      declaredSuit: 'spades',
    });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: HOUSE_CHANGED event to spades');
    const houseEvent = r1.events.find(e => e.type === 'HOUSE_CHANGED');
    expect(houseEvent).toBeDefined();
    expect(houseEvent!.newSuit).toBe('spades');

    log('Verify: turn advances to p3');
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p3');
  });
});
