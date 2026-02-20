import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Game Over — reversal with 4 players (tie on hand value, no 7s)', () => {
  it('should reverse when two remaining players tie for highest hand value, winner becomes loser', () => {
    const state = createTestState({
      hands: [
        [c('Ks'), c('3h')],   // p1: K=13, 3=3 = 16
        [c('4d')],             // p2: will win
        [c('6s'), c('10h')],  // p3: 6+10 = 16 — tie with p1!
        [c('2c'), c('3c')],   // p4: 2+3 = 5
      ],
      firstCard: c('4h'),
    });

    log('p2 plays 4♦ (last card) to win');
    const result = applyAction(state, 'p2', {
      type: 'PLAY_CARD',
      card: c('4d'),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    log('Verify: game finished');
    expect(result.newState.phase).toBe('finished');

    log('Verify: GAME_OVER event exists');
    const gameOver = result.events.find(e => e.type === 'GAME_OVER');
    expect(gameOver).toBeDefined();
    if (gameOver?.type !== 'GAME_OVER') return;

    log('Verify: reversal occurs — p1 and p3 tie at 16, winner p2 becomes loser');
    expect(gameOver.reversed).toBe(true);
    expect(gameOver.winnerId).toBe('p2');
    expect(gameOver.loserId).toBe('p2');

    log('Verify: p1 and p3 each have 0 sevens and handValue 16');
    const p1Summary = gameOver.hands.find(h => h.playerId === 'p1');
    const p3Summary = gameOver.hands.find(h => h.playerId === 'p3');
    expect(p1Summary?.sevens).toBe(0);
    expect(p1Summary?.handValue).toBe(16);
    expect(p3Summary?.sevens).toBe(0);
    expect(p3Summary?.handValue).toBe(16);
  });
});
