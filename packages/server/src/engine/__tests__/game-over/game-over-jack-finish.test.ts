import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Game Over — Jack finish (2 points)', () => {
  it('should win with 2 points when last card is a Jack, loser is player with highest hand value', () => {
    const state = createTestState({
      hands: [
        [c('Ks'), c('Qh')],  // p1: K=13, Q=12 = 25
        [c('Jc')],            // p2: will win with Jack
        [c('2s'), c('3s')],  // p3: 2+3 = 5
      ],
      firstCard: c('4h'),
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

    log('Verify: GAME_OVER event with winnerId p2 and 2 points');
    const gameOver = r1.events.find(e => e.type === 'GAME_OVER');
    expect(gameOver).toBeDefined();
    if (gameOver?.type !== 'GAME_OVER') return;

    expect(gameOver.winnerId).toBe('p2');
    expect(gameOver.points).toBe(2);

    log('Verify: p1 is the loser (highest hand value 25)');
    expect(gameOver.loserId).toBe('p1');
    expect(gameOver.reversed).toBe(false);
  });
});
