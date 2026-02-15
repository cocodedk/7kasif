import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('9♦ — deck low when multiple draws needed', () => {
  it('should handle deck with fewer cards than players needing to draw', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('9d'), c('Kc')],
        [c('Ks'), c('Qh')],
        [c('3h'), c('2s')],
      ],
      firstCard: c('4d'),
      remainingDeck: [c('Jh'), c('5c')], // only 2 cards for 3 draws
    });

    log('p2 plays 9♦ with only 2 cards in deck (3 players need to draw)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('9d') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: first two players drew successfully');
    const p1 = r1.newState.players.find(p => p.id === 'p1')!;
    const p3 = r1.newState.players.find(p => p.id === 'p3')!;
    // p1 is index 0 (drawn for), p3 is index 2 (drawn for), p4 is index 3 (drawn for)
    // Order in loop: i=0 (p1), i=2 (p3), i=3 (p4)
    // 2 cards available + recycled discard cards
    // All should draw since discard pile can be recycled
    expect(p1.hand.length).toBeGreaterThanOrEqual(3);
    expect(p3.hand.length).toBeGreaterThanOrEqual(3);

    log('Verify: game continues normally');
    expect(r1.newState.phase).toBe('playing');
  });
});
