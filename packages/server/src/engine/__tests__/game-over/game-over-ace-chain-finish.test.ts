import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Game Over — 4-ace chain finish (4 points)', () => {
  it('should win with 4 points when playing all four aces, loser is player with highest hand value', () => {
    const state = createTestState({
      hands: [
        [c('Ks'), c('Qh')],           // p1: K=13, Q=12 = 25
        [c('Ah'), c('Ad'), c('Ac'), c('As')],  // p2: will win with 4 aces
        [c('2s'), c('3s')],            // p3: 2+3 = 5
      ],
      firstCard: c('4h'),
    });

    log('p2 plays A♥');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Ah') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p2 plays A♦');
    const r2 = applyAction(r1.newState, 'p2', { type: 'PLAY_CARD', card: c('Ad') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('p2 plays A♣');
    const r3 = applyAction(r2.newState, 'p2', { type: 'PLAY_CARD', card: c('Ac') });
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;

    log('p2 plays A♠ (4th ace, last card)');
    const r4 = applyAction(r3.newState, 'p2', { type: 'PLAY_CARD', card: c('As') });
    expect(r4.ok).toBe(true);
    if (!r4.ok) return;

    log('Verify: game finished');
    expect(r4.newState.phase).toBe('finished');

    log('Verify: GAME_OVER event with winnerId p2 and 4 points');
    const gameOver = r4.events.find(e => e.type === 'GAME_OVER');
    expect(gameOver).toBeDefined();
    if (gameOver?.type !== 'GAME_OVER') return;

    expect(gameOver.winnerId).toBe('p2');
    expect(gameOver.points).toBe(4);

    log('Verify: p1 is the loser (highest hand value 25)');
    expect(gameOver.loserId).toBe('p1');
    expect(gameOver.reversed).toBe(false);

    log('Verify: p1 handValue 25, p3 handValue 5');
    const p1Summary = gameOver.hands.find(h => h.playerId === 'p1');
    const p3Summary = gameOver.hands.find(h => h.playerId === 'p3');
    expect(p1Summary?.handValue).toBe(25);
    expect(p3Summary?.handValue).toBe(5);
  });
});
