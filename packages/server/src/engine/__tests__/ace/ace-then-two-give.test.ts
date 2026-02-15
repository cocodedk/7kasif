import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';
import { cardEquals } from '@hafte-kasif/shared';

describe('Ace — then play 2 with giveCard', () => {
  it('should trigger 2 effect (give card) after ace chain resolves', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Ah'), c('2h'), c('9c'), c('3d')],
        [c('6d'), c('Ks')],
      ],
      firstCard: c('4h'),
    });

    log('p2 plays A♥');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Ah') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p2 plays 2♥ with giveCard 9♣');
    // p2 plays 2h (matching hearts) with giveCard
    const r2 = applyAction(r1.newState, 'p2', {
      type: 'PLAY_CARD',
      card: c('2h'),
      giveCard: c('9c'),
    });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: Ace chain cleared');
    // Ace chain cleared
    expect(r2.newState.pendingEffect).toBeNull();

    log('Verify: p3 receives 9♣');
    // 2's effect: give card to next player (p3)
    const p3 = r2.newState.players.find(p => p.id === 'p3')!;
    expect(p3.hand.some(card => cardEquals(card, c('9c')))).toBe(true);

    log('Verify: p2 has 1 card left');
    // p2: started with 4 cards, played 2h, gave 9c → 2 left (Ah was already played)
    const p2 = r2.newState.players.find(p => p.id === 'p2')!;
    expect(p2.hand.length).toBe(1); // only 3d remains

    log('Verify: CARD_GIVEN event recorded');
    // CARD_GIVEN event present
    const giveEvent = r2.events.find(e => e.type === 'CARD_GIVEN');
    expect(giveEvent).toBeDefined();
  });
});
