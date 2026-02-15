import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('9♦ — player who plays is not affected', () => {
  it('should not make the playing player draw', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('9d'), c('Kc')],
        [c('Ks'), c('Qh')],
      ],
      firstCard: c('4d'),
      remainingDeck: [c('Jh'), c('5c')],
    });

    log('p2 plays 9♦');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('9d') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: p2 did NOT draw (only played, now has 1 card)');
    const p2 = r1.newState.players.find(p => p.id === 'p2')!;
    expect(p2.hand.length).toBe(1); // played 9d, only Kc left

    log('Verify: no CARD_DRAWN event for p2');
    const p2DrawEvents = r1.events.filter(
      e => e.type === 'CARD_DRAWN' && e.playerId === 'p2'
    );
    expect(p2DrawEvents.length).toBe(0);
  });
});
