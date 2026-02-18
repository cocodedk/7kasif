import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Queen — consecutive Queens', () => {
  it('should allow consecutive Queens based on which card is revealed', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Qd'), c('9c')],
        [c('Qh'), c('Ks'), c('3c')],
      ],
      firstCard: c('4d'),
    });

    log('p2 plays Q♦ (matches suit)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Qd') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    expect(r1.newState.pendingEffect).toEqual({ type: 'queen-reveal', targetPlayerId: 'p3' });

    log('Test case: p3 reveals K♠ (not Q♥)');
    const r2 = applyAction(r1.newState, 'p3', { type: 'REVEAL_CARD', card: c('Ks') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Q♥ was NOT revealed — p3 can play Q♥ (matches value of Q♦)');
    const r3 = applyAction(r2.newState, 'p3', { type: 'PLAY_CARD', card: c('Qh') });
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;

    log('Verify: turn advances to p1');
    expect(r3.newState.players[r3.newState.currentPlayerIndex].id).toBe('p1');
  });

  it('should reject playing revealed queen same turn', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Qd'), c('9c')],
        [c('Qh'), c('Ks'), c('3c')],
      ],
      firstCard: c('4d'),
    });

    log('p2 plays Q♦');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Qd') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 reveals Q♥');
    const r2 = applyAction(r1.newState, 'p3', { type: 'REVEAL_CARD', card: c('Qh') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Q♥ is locked — p3 cannot play it this turn');
    const r3 = applyAction(r2.newState, 'p3', { type: 'PLAY_CARD', card: c('Qh') });
    expect(r3.ok).toBe(false);
  });
});
