import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('King — deck low during draw', () => {
  it('should handle draw with only 1 card in deck', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Kd'), c('9c')],
        [c('3h'), c('Qh')],
      ],
      firstCard: c('4d'),
      remainingDeck: [c('Jh')],
    });

    log('p2 plays K♦ with 1 card in deck');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Kd') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: p3 drew 1 card (now 3)');
    const p3 = r1.newState.players.find(p => p.id === 'p3')!;
    expect(p3.hand.length).toBe(3);

    log('Verify: game continues');
    expect(r1.newState.phase).toBe('playing');
  });
});
