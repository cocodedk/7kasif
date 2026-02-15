import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Six — after Jack with declared suit', () => {
  it('should allow 6 of declared suit after Jack', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Jc'), c('9h')],
        [c('6h'), c('Ks')],
      ],
      firstCard: c('4d'),
      remainingDeck: [c('Qd'), c('2c')],
    });

    log('p2 plays J♣ declaring hearts');
    const r1 = applyAction(state, 'p2', {
      type: 'PLAY_CARD',
      card: c('Jc'),
      declaredSuit: 'hearts',
    });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 plays 6♥ (matches declared suit)');
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('6h') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: p1 (next 1 from p3) drew 1 card');
    const p1 = r2.newState.players.find(p => p.id === 'p1')!;
    expect(p1.hand.length).toBe(3);

    log('Verify: p2 (next 2 from p3) drew 1 card');
    const p2 = r2.newState.players.find(p => p.id === 'p2')!;
    expect(p2.hand.length).toBe(2); // had 1 (9h) + 1 drawn
  });

  it('should reject 6 not matching declared suit or jack value', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Jc'), c('9h')],
        [c('6s'), c('Ks')],
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

    log('p3 tries 6♠ (doesn\'t match declared hearts)');
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('6s') });
    expect(r2.ok).toBe(false);
    log('Verify: rejected');
  });
});
