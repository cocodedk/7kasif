import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Queen — all cards already revealed', () => {
  it('should not set pendingEffect when all cards are already revealed', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],       // p1
        [c('Qd'), c('9c')],       // p2
        [c('6d'), c('Ks')],       // p3
      ],
      firstCard: c('4d'),
    });

    const p3 = state.players.find(p => p.id === 'p3')!;
    p3.revealedCards = [...p3.hand];

    log('p2 plays Q♦ when p3 already has all cards revealed');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Qd') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: no pendingEffect set (no unrevealed cards)');
    expect(r1.newState.pendingEffect).toBeNull();

    log('Verify: p3 still has same number of revealed cards');
    const p3After = r1.newState.players.find(p => p.id === 'p3')!;
    expect(p3After.revealedCards.length).toBe(2);

    log('Verify: no CARD_REVEALED event emitted');
    const revealEvent = r1.events.find(e => e.type === 'CARD_REVEALED');
    expect(revealEvent).toBeUndefined();

    log('Verify: turn still advances');
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p3');
  });
});
