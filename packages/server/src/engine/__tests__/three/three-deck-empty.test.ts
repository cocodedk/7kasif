import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Three — deck empty during draw', () => {
  it('should recycle discard pile when previous player draws with empty deck', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],       // p1
        [c('3d'), c('9c')],       // p2
        [c('6d'), c('Ks')],       // p3
      ],
      firstCard: c('4d'),
      remainingDeck: [],           // empty deck
    });
    // Discard: [4d]. After p2 plays 3d → discard: [4d, 3d]
    // Draw triggers: deck empty → reshuffle takes [4d] to deck, discard becomes [3d]
    // p1 draws 4d from deck

    log('p2 plays 3♦ with empty deck (discard recycles to provide draw)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('3d') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: p1 drew 1 card (from recycled discard)');
    const p1 = r1.newState.players.find(p => p.id === 'p1')!;
    expect(p1.hand.length).toBe(3); // 2 + 1 drawn
  });

  it('should handle completely empty deck and minimal discard gracefully', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],       // p1
        [c('3d'), c('9c')],       // p2
        [c('6d'), c('Ks')],       // p3
      ],
      firstCard: c('4d'),
      remainingDeck: [c('Qh')],   // 1 card in deck
    });

    log('p2 plays 3♦ (deck has 1 card for draw)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('3d') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: p1 drew 1 card');
    const p1 = r1.newState.players.find(p => p.id === 'p1')!;
    expect(p1.hand.length).toBe(3);
  });
});
