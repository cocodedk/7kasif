import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Ace — chain four aces and win', () => {
  it('should win with 4 points when playing all four aces', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Ah'), c('Ad'), c('Ac'), c('As')],
        [c('6d'), c('Ks')],
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

    log('p2 plays A♠');
    const r4 = applyAction(r3.newState, 'p2', { type: 'PLAY_CARD', card: c('As') });
    expect(r4.ok).toBe(true);
    if (!r4.ok) return;

    // Hand is empty, 4 aces played → 4 points, game over
    log('Verify: game finished, p2 wins with 4 points');
    expect(r4.newState.phase).toBe('finished');
    const gameOver = r4.events.find(e => e.type === 'GAME_OVER');
    expect(gameOver).toBeDefined();
    if (gameOver?.type === 'GAME_OVER') {
      expect(gameOver.winnerId).toBe('p2');
      expect(gameOver.points).toBe(4);
    }
  });
});
