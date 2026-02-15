import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Queen — reveals next player card', () => {
  it('should reveal a card from the next player and emit CARD_REVEALED', () => {
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

    log('Verify: p3 (next player) has 1 revealed card');
    const p3 = r1.newState.players.find(p => p.id === 'p3')!;
    expect(p3.revealedCards.length).toBe(1);

    log('Verify: revealed card is from p3 hand');
    const revealedCard = p3.revealedCards[0];
    expect(p3.hand.some(c => c.suit === revealedCard.suit && c.value === revealedCard.value)).toBe(true);

    log('Verify: CARD_REVEALED event emitted for p3');
    const revealEvent = r1.events.find(e => e.type === 'CARD_REVEALED');
    expect(revealEvent).toBeDefined();
    if (revealEvent?.type === 'CARD_REVEALED') {
      expect(revealEvent.playerId).toBe('p3');
    }

    log('Verify: turn advances to p3');
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p3');
  });
});
