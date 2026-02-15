import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Six — last card win', () => {
  it('should win when 6 is the last card played', () => {
    const state = createTestState({
      hands: [
        [c('Ks'), c('Qh')],       // p1
        [c('6d')],                 // p2 — last card
        [c('4s'), c('2h')],       // p3
      ],
      firstCard: c('4d'),
      remainingDeck: [c('Jh'), c('5c')],
    });

    log('p2 plays 6♦ as last card');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('6d') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: game finished, p2 wins with 1 point');
    expect(r1.newState.phase).toBe('finished');
    const gameOver = r1.events.find(e => e.type === 'GAME_OVER');
    expect(gameOver).toBeDefined();
    if (gameOver?.type === 'GAME_OVER') {
      expect(gameOver.winnerId).toBe('p2');
      expect(gameOver.points).toBe(1);
    }
  });
});
