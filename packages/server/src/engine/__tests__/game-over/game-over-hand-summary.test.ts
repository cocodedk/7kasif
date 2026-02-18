import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Game Over — hand summary', () => {
  it('should include hand summaries for all non-winner players in GAME_OVER event', () => {
    const state = createTestState({
      hands: [
        [c('Ks'), c('Qh'), c('7d')],  // p1: K=13, Q=12, 7=7 = 32, has one 7
        [c('4d')],                     // p2: will win
        [c('2s'), c('3s'), c('Jc')],   // p3: 2+3+11=16, multiplier x2 = 32
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

    log('Verify: winnerId is p2');
    expect(gameOver.winnerId).toBe('p2');

    log('Verify: hands array includes p1 and p3 (not winner p2)');
    expect(gameOver.hands.length).toBe(2);

    log('Verify: p1 hand summary');
    const p1Summary = gameOver.hands.find(h => h.playerId === 'p1');
    expect(p1Summary).toBeDefined();
    if (p1Summary) {
      expect(p1Summary.playerId).toBe('p1');
      expect(p1Summary.playerName).toBe('Player 1');
      expect(p1Summary.handValue).toBe(32); // K=13 + Q=12 + 7=7
      expect(p1Summary.sevens).toBe(1);
      expect(p1Summary.cardCount).toBe(3);
    }

    log('Verify: p3 hand summary');
    const p3Summary = gameOver.hands.find(h => h.playerId === 'p3');
    expect(p3Summary).toBeDefined();
    if (p3Summary) {
      expect(p3Summary.playerId).toBe('p3');
      expect(p3Summary.playerName).toBe('Player 3');
      expect(p3Summary.handValue).toBe(32); // (2+3+11) x 2 = 32 (Jack multiplier)
      expect(p3Summary.sevens).toBe(0);
      expect(p3Summary.cardCount).toBe(3);
    }
  });

  it('should include correct 7s count for multiple 7s in hand', () => {
    const state = createTestState({
      hands: [
        [c('7h'), c('7d'), c('7c')],  // p1: three 7s
        [c('5s')],                     // p2: will win
        [c('Ks'), c('Qh')],            // p3: no 7s
      ],
      firstCard: c('5h'),
    });

    log('p2 plays 5♠ (last card) to win');
    const result = applyAction(state, 'p2', {
      type: 'PLAY_CARD',
      card: c('5s'),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    log('Verify: GAME_OVER event exists');
    const gameOver = result.events.find(e => e.type === 'GAME_OVER');
    expect(gameOver).toBeDefined();
    if (gameOver?.type !== 'GAME_OVER') return;

    log('Verify: p1 has 3 sevens');
    const p1Summary = gameOver.hands.find(h => h.playerId === 'p1');
    expect(p1Summary?.sevens).toBe(3);
    expect(p1Summary?.handValue).toBe(21); // 7+7+7

    log('Verify: p3 has 0 sevens');
    const p3Summary = gameOver.hands.find(h => h.playerId === 'p3');
    expect(p3Summary?.sevens).toBe(0);
    expect(p3Summary?.handValue).toBe(25); // 13+12
  });
});
