import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Two — last card win (3 points)', () => {
  it('should win with 3 points when 2 is played as last card with no give needed', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],  // p1
        [c('2h')],           // p2 — only card
        [c('6d'), c('Ks')],  // p3
      ],
      firstCard: c('4h'),
      currentPlayerIndex: 1,
    });

    log('p2 plays 2♥ as last card (no giveCard needed)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('2h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: game finished');
    expect(r1.newState.phase).toBe('finished');

    log('Verify: GAME_OVER event with 3 points, winner p2');
    const gameOver = r1.events.find(e => e.type === 'GAME_OVER');
    expect(gameOver).toBeDefined();
    if (gameOver?.type === 'GAME_OVER') {
      expect(gameOver.winnerId).toBe('p2');
      expect(gameOver.points).toBe(3);
    }
  });
});
