import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Game Over — 7s loser rule', () => {
  it('should make player with 7 lose even if hand value is lower', () => {
    const state = createTestState({
      hands: [
        [c('Ks'), c('Qh')],           // p1: K=13, Q=12 = 25, no 7s
        [c('4d')],                     // p2: will win
        [c('7s'), c('2c')],            // p3: 7+2 = 9 (lower than p1), has a 7
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

    log('Verify: GAME_OVER event exists');
    const gameOver = result.events.find(e => e.type === 'GAME_OVER');
    expect(gameOver).toBeDefined();
    if (gameOver?.type !== 'GAME_OVER') return;

    log('Verify: p3 loses (has a 7), even though hand value is lower');
    expect(gameOver.loserId).toBe('p3');
    expect(gameOver.winnerId).toBe('p2');
    expect(gameOver.reversed).toBe(false);

    log('Verify: p3 has 1 seven, p1 has 0 sevens');
    const p3Summary = gameOver.hands.find(h => h.playerId === 'p3');
    const p1Summary = gameOver.hands.find(h => h.playerId === 'p1');
    expect(p3Summary?.sevens).toBe(1);
    expect(p1Summary?.sevens).toBe(0);
  });

  it('should make player with most 7s lose when multiple players have 7s', () => {
    const state = createTestState({
      hands: [
        [c('7h'), c('2d')],            // p1: 1 seven
        [c('5s')],                      // p2: will win
        [c('7d'), c('7c'), c('3h')],    // p3: 2 sevens (more than p1)
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

    log('Verify: p3 loses (has most 7s)');
    expect(gameOver.loserId).toBe('p3');
    expect(gameOver.reversed).toBe(false);

    log('Verify: p3 has 2 sevens, p1 has 1 seven');
    const p3Summary = gameOver.hands.find(h => h.playerId === 'p3');
    const p1Summary = gameOver.hands.find(h => h.playerId === 'p1');
    expect(p3Summary?.sevens).toBe(2);
    expect(p1Summary?.sevens).toBe(1);
  });

  it('should fall back to hand value when 7 count is tied', () => {
    const state = createTestState({
      hands: [
        [c('7h'), c('Ks')],            // p1: 1 seven, handValue = 7+13 = 20
        [c('3s')],                      // p2: will win
        [c('7d'), c('2c')],             // p3: 1 seven, handValue = 7+2 = 9
      ],
      firstCard: c('3h'),
    });

    log('p2 plays 3♠ (last card) to win');
    const result = applyAction(state, 'p2', {
      type: 'PLAY_CARD',
      card: c('3s'),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    log('Verify: GAME_OVER event exists');
    const gameOver = result.events.find(e => e.type === 'GAME_OVER');
    expect(gameOver).toBeDefined();
    if (gameOver?.type !== 'GAME_OVER') return;

    log('Verify: p1 loses (tied on 7s but higher hand value)');
    expect(gameOver.loserId).toBe('p1');
    expect(gameOver.reversed).toBe(false);

    log('Verify: both have 1 seven, but p1 has higher hand value');
    const p1Summary = gameOver.hands.find(h => h.playerId === 'p1');
    const p3Summary = gameOver.hands.find(h => h.playerId === 'p3');
    expect(p1Summary?.sevens).toBe(1);
    expect(p3Summary?.sevens).toBe(1);
    expect(p1Summary?.handValue).toBe(20);
    expect(p3Summary?.handValue).toBe(9);
  });

  it('should reverse when multiple losers tied on both 7s and hand value', () => {
    const state = createTestState({
      hands: [
        [c('7h'), c('Ks')],            // p1: 1 seven, handValue = 7+13 = 20
        [c('6s')],                      // p2: will win
        [c('7d'), c('Kc')],             // p3: 1 seven, handValue = 7+13 = 20 (tie!)
      ],
      firstCard: c('6h'),
    });

    log('p2 plays 6♠ (last card) to win');
    const result = applyAction(state, 'p2', {
      type: 'PLAY_CARD',
      card: c('6s'),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    log('Verify: GAME_OVER event exists');
    const gameOver = result.events.find(e => e.type === 'GAME_OVER');
    expect(gameOver).toBeDefined();
    if (gameOver?.type !== 'GAME_OVER') return;

    log('Verify: reversal occurs, winner p2 becomes loser');
    expect(gameOver.reversed).toBe(true);
    expect(gameOver.loserId).toBe('p2'); // winner becomes loser
    expect(gameOver.winnerId).toBe('p2'); // still reported as winner

    log('Verify: p1 and p3 both have 1 seven and handValue 20');
    const p1Summary = gameOver.hands.find(h => h.playerId === 'p1');
    const p3Summary = gameOver.hands.find(h => h.playerId === 'p3');
    expect(p1Summary?.sevens).toBe(1);
    expect(p3Summary?.sevens).toBe(1);
    expect(p1Summary?.handValue).toBe(20);
    expect(p3Summary?.handValue).toBe(20);
  });

  it('should fall back to highest hand value when no one has 7s', () => {
    const state = createTestState({
      hands: [
        [c('Ks'), c('Qh')],            // p1: 13+12 = 25
        [c('4d')],                      // p2: will win
        [c('2s'), c('3s')],             // p3: 2+3 = 5
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

    log('Verify: GAME_OVER event exists');
    const gameOver = result.events.find(e => e.type === 'GAME_OVER');
    expect(gameOver).toBeDefined();
    if (gameOver?.type !== 'GAME_OVER') return;

    log('Verify: p1 loses (highest hand value, no 7s)');
    expect(gameOver.loserId).toBe('p1');
    expect(gameOver.reversed).toBe(false);

    log('Verify: no one has 7s');
    const p1Summary = gameOver.hands.find(h => h.playerId === 'p1');
    const p3Summary = gameOver.hands.find(h => h.playerId === 'p3');
    expect(p1Summary?.sevens).toBe(0);
    expect(p3Summary?.sevens).toBe(0);
  });
});
