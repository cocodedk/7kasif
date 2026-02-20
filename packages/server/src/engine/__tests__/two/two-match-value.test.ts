import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Two — match by value (different suit)', () => {
  it('should allow 2 matching discard by value and give card to next player', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],           // p1
        [c('2c'), c('9h'), c('3d')],  // p2 — 2♣ matches 2♦ by value
        [c('6h'), c('Ks')],           // p3
      ],
      firstCard: c('2d'),
      currentPlayerIndex: 1,
    });

    log('p2 plays 2♣ (matches 2♦ by value) giving 9♥ to p3');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('2c'), giveCard: c('9h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: p3 received 9♥');
    const p3 = r1.newState.players.find(p => p.id === 'p3')!;
    expect(p3.hand).toContainEqual(c('9h'));

    log('Verify: turn advances to p3');
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p3');
  });
});
