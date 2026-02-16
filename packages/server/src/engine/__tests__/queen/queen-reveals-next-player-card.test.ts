import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Queen — reveals next player card', () => {
  it('should set pendingEffect for next player to reveal, then emit CARD_REVEALED on REVEAL_CARD', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],       // p1
        [c('Qd'), c('9c')],       // p2
        [c('6d'), c('Ks')],       // p3
      ],
      firstCard: c('4d'),
    });

    log('p2 plays Q♦ (matches suit)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Qd') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: pendingEffect is queen-reveal for p3');
    expect(r1.newState.pendingEffect).toEqual({ type: 'queen-reveal', targetPlayerId: 'p3' });

    log('Verify: turn advances to p3');
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p3');

    log('Verify: no CARD_REVEALED event yet');
    const revealEventBefore = r1.events.find(e => e.type === 'CARD_REVEALED');
    expect(revealEventBefore).toBeUndefined();

    log('p3 submits REVEAL_CARD action');
    const r2 = applyAction(r1.newState, 'p3', { type: 'REVEAL_CARD', card: c('6d') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: p3 has 1 revealed card');
    const p3 = r2.newState.players.find(p => p.id === 'p3')!;
    expect(p3.revealedCards.length).toBe(1);
    expect(p3.revealedCards[0]).toEqual(c('6d'));

    log('Verify: p3 has 1 locked card');
    expect(p3.lockedCards.length).toBe(1);
    expect(p3.lockedCards[0]).toEqual(c('6d'));

    log('Verify: pendingEffect cleared');
    expect(r2.newState.pendingEffect).toBeNull();

    log('Verify: CARD_REVEALED event emitted for p3');
    const revealEvent = r2.events.find(e => e.type === 'CARD_REVEALED');
    expect(revealEvent).toBeDefined();
    if (revealEvent?.type === 'CARD_REVEALED') {
      expect(revealEvent.playerId).toBe('p3');
    }
  });
});
