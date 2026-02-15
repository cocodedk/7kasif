import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Ace — then play Jack during ace chain', () => {
  it('should reject Jack during ace chain (Jack does not match ace suit rule)', () => {
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

    log('p2 tries J♣ (non-matching suit on ace chain)');
    // Jack of clubs — not an ace, not hearts suit
    // canPlayOnAce: checks ace or matching suit → Jc is not ace and suit is clubs ≠ hearts
    const r2 = applyAction(r1.newState, 'p2', {
      type: 'PLAY_CARD',
      card: c('Jc'),
      declaredSuit: 'spades',
    });
    log('Verify: Play rejected');
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
    // Jack of hearts — matches ace suit
    const r2 = applyAction(r1.newState, 'p2', {
      type: 'PLAY_CARD',
      card: c('Jh'),
      declaredSuit: 'spades',
    });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: Ace chain resolved and house changed');
    // Ace chain resolves, Jack's effect applies (house change)
    expect(r2.newState.pendingEffect).toBeNull();
    const houseChanged = r2.events.find(e => e.type === 'HOUSE_CHANGED');
    expect(houseChanged).toBeDefined();
  });
});
