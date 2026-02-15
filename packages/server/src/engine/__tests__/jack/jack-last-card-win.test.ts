import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Jack — last card win (2 points)', () => {
  it('should win with 2 points when Jack is the last card', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Jc')],
        [c('Ks'), c('Qh')],
      ],
      firstCard: c('4d'),
    });

    log('p2 plays J♣ as last card, declaring hearts');
    const r1 = applyAction(state, 'p2', {
      type: 'PLAY_CARD',
      card: c('Jc'),
      declaredSuit: 'hearts',
    });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: game finished');
    expect(r1.newState.phase).toBe('finished');

    log('Verify: GAME_OVER event with 2 points');
    const gameOver = r1.events.find(e => e.type === 'GAME_OVER');
    expect(gameOver).toBeDefined();
    expect(gameOver!.points).toBe(2);
  });
});
