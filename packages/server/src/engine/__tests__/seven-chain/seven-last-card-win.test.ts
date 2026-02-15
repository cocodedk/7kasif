import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Seven — last card win', () => {
  it('should check if playing 7 as last card wins the game', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7h')],
        [c('6d'), c('Ks')],
      ],
      firstCard: c('4h'),
    });

    log('p2 plays 7♥ as last card');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: game finished, p2 wins, points=1');
    expect(r1.newState.phase).toBe('finished');
    const gameOver = r1.events.find(e => e.type === 'GAME_OVER');
    expect(gameOver).toBeDefined();
    if (gameOver?.type === 'GAME_OVER') {
      expect(gameOver.winnerId).toBe('p2');
      expect(gameOver.points).toBe(1);
    }
  });
});
