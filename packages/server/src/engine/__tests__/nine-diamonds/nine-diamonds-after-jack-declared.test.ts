import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('9♦ — after Jack with declared suit', () => {
  it('should allow 9♦ when diamonds is declared suit', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Jc'), c('Kh')],
        [c('9d'), c('Ks')],
      ],
      firstCard: c('4c'),
      remainingDeck: [c('Jh'), c('5c')],
    });

    log('p2 plays J♣ declaring diamonds');
    const r1 = applyAction(state, 'p2', {
      type: 'PLAY_CARD',
      card: c('Jc'),
      declaredSuit: 'diamonds',
    });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 plays 9♦ (matches declared diamonds)');
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('9d') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: p1 drew 1 card (9♦ effect)');
    const p1 = r2.newState.players.find(p => p.id === 'p1')!;
    expect(p1.hand.length).toBe(3);

    log('Verify: p2 drew 1 card (9♦ effect)');
    const p2 = r2.newState.players.find(p => p.id === 'p2')!;
    expect(p2.hand.length).toBe(2); // had 1 (Kh) + drew 1
  });

  it('should reject 9♦ when declared suit is not diamonds', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Jc'), c('Kh')],
        [c('9d'), c('Ks')],
      ],
      firstCard: c('4c'),
    });

    log('p2 plays J♣ declaring hearts');
    const r1 = applyAction(state, 'p2', {
      type: 'PLAY_CARD',
      card: c('Jc'),
      declaredSuit: 'hearts',
    });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 tries 9♦ (doesn\'t match declared hearts)');
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('9d') });
    expect(r2.ok).toBe(false);
    log('Verify: rejected');
  });
});
