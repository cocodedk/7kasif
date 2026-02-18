import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Queen — cannot re-reveal an already revealed card', () => {
  it('should reject REVEAL_CARD for a card already in revealedCards', () => {
    const state = createTestState({
      hands: [
        [c('Qh'), c('5s')],                 // p1
        [c('9c'), c('Ks'), c('4d')],        // p2 — target, Ks already revealed
        [c('6h'), c('8s')],                  // p3
      ],
      firstCard: c('3h'),
      currentPlayerIndex: 0,
    });

    // Pre-set: p2 already had Ks revealed by a previous queen
    state.players[1].revealedCards = [c('Ks')];

    log('p1 plays Q♥ — sets pendingEffect for p2');
    const r1 = applyAction(state, 'p1', { type: 'PLAY_CARD', card: c('Qh') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    expect(r1.newState.pendingEffect).toEqual({ type: 'queen-reveal', targetPlayerId: 'p2' });

    log('p2 tries to reveal K♠ again — should be rejected');
    const r2 = applyAction(r1.newState, 'p2', { type: 'REVEAL_CARD', card: c('Ks') });
    expect(r2.ok).toBe(false);
    if (r2.ok) return;
    expect(r2.reason).toBe('Card is already revealed');

    log('p2 reveals 9♣ instead — should succeed');
    const r3 = applyAction(r1.newState, 'p2', { type: 'REVEAL_CARD', card: c('9c') });
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;

    const p2After = r3.newState.players.find(p => p.id === 'p2')!;
    expect(p2After.revealedCards).toHaveLength(2);
    expect(p2After.revealedCards).toContainEqual(c('Ks'));
    expect(p2After.revealedCards).toContainEqual(c('9c'));
  });

  it('should skip queen-reveal when all target cards are already revealed', () => {
    const state = createTestState({
      hands: [
        [c('Qh'), c('5s')],           // p1
        [c('9c'), c('Ks')],           // p2 — all revealed
        [c('6h'), c('8s')],           // p3
      ],
      firstCard: c('3h'),
      currentPlayerIndex: 0,
    });

    // Pre-set: all of p2's cards are already revealed
    state.players[1].revealedCards = [c('9c'), c('Ks')];

    log('p1 plays Q♥ — p2 has no unrevealed cards');
    const r1 = applyAction(state, 'p1', { type: 'PLAY_CARD', card: c('Qh') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('pendingEffect should be null (nothing to reveal)');
    expect(r1.newState.pendingEffect).toBeNull();

    log('turn should advance past p2 normally');
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p2');
  });
});
