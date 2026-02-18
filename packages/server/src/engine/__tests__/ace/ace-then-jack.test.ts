import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Ace — then play Jack during ace chain', () => {
  it('should allow Jack of any suit during ace chain (Jack is wild)', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Ah'), c('Jc'), c('9c')],
        [c('6d'), c('Ks')],
      ],
      firstCard: c('4h'),
    });

    log('p2 plays A♥');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Ah') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p2 plays J♣ (Jack is wild — allowed during ace chain)');
    const r2 = applyAction(r1.newState, 'p2', {
      type: 'PLAY_CARD',
      card: c('Jc'),
      declaredSuit: 'spades',
    });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: Ace chain resolved and house changed');
    expect(r2.newState.pendingEffect).toBeNull();
    const houseChanged = r2.events.find(e => e.type === 'HOUSE_CHANGED');
    expect(houseChanged).toBeDefined();
  });

  it('should require declaredSuit when playing Jack during ace chain', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Ah'), c('Jh'), c('9c')],
        [c('6d'), c('Ks')],
      ],
      firstCard: c('4h'),
    });

    log('p2 plays A♥');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Ah') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p2 plays J♥ without declaredSuit — should be rejected');
    const r2 = applyAction(r1.newState, 'p2', {
      type: 'PLAY_CARD',
      card: c('Jh'),
    });
    expect(r2.ok).toBe(false);
  });

  it('should allow Jack of matching suit during ace chain', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Ah'), c('Jh'), c('9c')],
        [c('6d'), c('Ks')],
      ],
      firstCard: c('4h'),
    });

    log('p2 plays A♥');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Ah') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p2 plays J♥ (matching suit)');
    const r2 = applyAction(r1.newState, 'p2', {
      type: 'PLAY_CARD',
      card: c('Jh'),
      declaredSuit: 'spades',
    });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: Ace chain resolved and house changed');
    expect(r2.newState.pendingEffect).toBeNull();
    const houseChanged = r2.events.find(e => e.type === 'HOUSE_CHANGED');
    expect(houseChanged).toBeDefined();
  });
});
