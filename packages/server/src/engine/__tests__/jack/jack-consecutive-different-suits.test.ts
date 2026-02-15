import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Jack — consecutive Jacks declaring different suits', () => {
  it('should override declared suit with each new Jack', () => {
    const state = createTestState({
      hands: [
        [c('Jh'), c('5s')],
        [c('Jc'), c('9h')],
        [c('Jd'), c('Ks')],
      ],
      firstCard: c('4d'),
      currentPlayerIndex: 1,
    });

    log('p2 plays J♣ declaring hearts');
    const r1 = applyAction(state, 'p2', {
      type: 'PLAY_CARD',
      card: c('Jc'),
      declaredSuit: 'hearts',
    });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 plays J♦ declaring spades (overrides hearts)');
    const r2 = applyAction(r1.newState, 'p3', {
      type: 'PLAY_CARD',
      card: c('Jd'),
      declaredSuit: 'spades',
    });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: latest declared suit is spades');
    const houseEvent = r2.events.find(e => e.type === 'HOUSE_CHANGED');
    expect(houseEvent).toBeDefined();
    expect(houseEvent!.newSuit).toBe('spades');

    log('p1 plays J♥ declaring diamonds (overrides spades)');
    const r3 = applyAction(r2.newState, 'p1', {
      type: 'PLAY_CARD',
      card: c('Jh'),
      declaredSuit: 'diamonds',
    });
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;

    log('Verify: latest declared suit is diamonds');
    const houseEvent3 = r3.events.find(e => e.type === 'HOUSE_CHANGED');
    expect(houseEvent3).toBeDefined();
    expect(houseEvent3!.newSuit).toBe('diamonds');
  });
});
