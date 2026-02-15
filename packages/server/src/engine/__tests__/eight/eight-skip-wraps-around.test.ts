import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Eight — skip wraps around', () => {
  it('should wrap around when skipped player is last in order', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Ks'), c('Qh')],
        [c('8d'), c('9c')],
      ],
      firstCard: c('4d'),
      currentPlayerIndex: 2,
    });

    log('p3 plays 8♦ — skips p1, turn goes to p2');
    const r1 = applyAction(state, 'p3', { type: 'PLAY_CARD', card: c('8d') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: p1 was skipped');
    const skipEvent = r1.events.find(e => e.type === 'PLAYER_SKIPPED');
    expect(skipEvent).toBeDefined();
    expect(skipEvent!.playerId).toBe('p1');

    log('Verify: turn goes to p2');
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p2');
  });
});
