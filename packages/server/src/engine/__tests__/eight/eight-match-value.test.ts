import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Eight — match by value', () => {
  it('should allow playing 8 that matches by value (different suit)', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('8c'), c('9h')],
        [c('Ks'), c('Qh')],
      ],
      firstCard: c('8d'),
    });

    log('p2 plays 8♣ (matches value of 8♦ on discard)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('8c') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: p3 was skipped');
    const skipEvent = r1.events.find(e => e.type === 'PLAYER_SKIPPED');
    expect(skipEvent).toBeDefined();
    expect(skipEvent!.playerId).toBe('p3');

    log('Verify: turn goes to p1 (skipped p3, wraps around)');
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p1');
  });
});
