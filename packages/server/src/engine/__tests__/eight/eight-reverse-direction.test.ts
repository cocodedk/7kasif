import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Eight — reverse direction changes skip target', () => {
  it('should skip the correct player when direction is reversed', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('8h'), c('9c')],
        [c('Ks'), c('Qh')],
        [c('3h'), c('2s')],
      ],
      firstCard: c('4h'),
      direction: -1,
    });

    log('Direction reversed (-1), p2 plays 8♥');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('8h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: p1 was skipped (next in reverse from p2)');
    const skipEvent = r1.events.find(e => e.type === 'PLAYER_SKIPPED');
    expect(skipEvent).toBeDefined();
    expect(skipEvent!.playerId).toBe('p1');

    log('Verify: turn goes to p4 (skip p1, next is p4 in reverse)');
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p4');
  });
});
