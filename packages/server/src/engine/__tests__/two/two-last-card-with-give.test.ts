import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Two — last card with give wins (1 point)', () => {
  it('should win with 1 point when 2 is played with giveCard leaving hand empty', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],  // p1
        [c('2h'), c('9c')],  // p2 — plays 2h, gives 9c, hand becomes empty
        [c('6d'), c('Ks')],  // p3
      ],
      firstCard: c('4h'),
      currentPlayerIndex: 1,
    });

    log('p2 plays 2♥ giving 9♣ to p3');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('2h'), giveCard: c('9c') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: game finished');
    expect(r1.newState.phase).toBe('finished');

    log('Verify: GAME_OVER event with 1 point, winner p2');
    const gameOver = r1.events.find(e => e.type === 'GAME_OVER');
    expect(gameOver).toBeDefined();
    if (gameOver?.type === 'GAME_OVER') {
      expect(gameOver.winnerId).toBe('p2');
      expect(gameOver.points).toBe(1);
    }
  });
});
