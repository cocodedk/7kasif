import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Jack — Jack on Jack', () => {
  it('should allow playing Jack on top of another Jack (wild on wild)', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Jc'), c('9h')],
        [c('Jd'), c('Ks')],
      ],
      firstCard: c('4d'),
    });

    log('p2 plays J♣ declaring hearts');
    const r1 = applyAction(state, 'p2', {
      type: 'PLAY_CARD',
      card: c('Jc'),
      declaredSuit: 'hearts',
    });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 plays J♦ declaring spades (Jack is always wild)');
    const r2 = applyAction(r1.newState, 'p3', {
      type: 'PLAY_CARD',
      card: c('Jd'),
      declaredSuit: 'spades',
    });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: HOUSE_CHANGED to spades');
    const houseEvent = r2.events.find(e => e.type === 'HOUSE_CHANGED');
    expect(houseEvent).toBeDefined();
    expect(houseEvent!.newSuit).toBe('spades');

    log('Verify: turn advances to p1');
    expect(r2.newState.players[r2.newState.currentPlayerIndex].id).toBe('p1');
  });
});
