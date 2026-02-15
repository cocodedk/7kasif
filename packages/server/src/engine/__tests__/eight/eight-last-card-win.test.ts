import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Eight — last card win', () => {
  it('should win when 8 is the last card played', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('8d')],
        [c('Ks'), c('Qh')],
      ],
      firstCard: c('4d'),
    });

    log('p2 plays 8♦ as last card');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('8d') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: game finished, p2 wins with 1 point');
    expect(r1.newState.phase).toBe('finished');
    const winner = r1.events.find(e => e.type === 'GAME_OVER');
    expect(winner).toBeDefined();
  });
});
