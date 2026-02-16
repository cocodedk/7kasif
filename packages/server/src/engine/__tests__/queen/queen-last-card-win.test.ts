import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Queen — last card win', () => {
  it('should win when Queen is the last card played', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Qd')],
        [c('Ks'), c('3h')],
      ],
      firstCard: c('4d'),
    });

    log('p2 plays Q♦ as last card');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Qd') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: game finished, p2 wins with 1 point');
    expect(r1.newState.phase).toBe('finished');
    const gameOver = r1.events.find(e => e.type === 'GAME_OVER');
    expect(gameOver).toBeDefined();
    expect(gameOver!.points).toBe(1);

    log('Verify: no pendingEffect (win happens before queen effect)');
    expect(r1.newState.pendingEffect).toBeNull();
  });
});
