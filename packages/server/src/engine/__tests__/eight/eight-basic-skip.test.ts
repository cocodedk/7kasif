import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Eight — basic skip next player', () => {
  it('should skip the next player and advance turn by 2', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('8d'), c('9c')],
        [c('Ks'), c('Qh')],
        [c('3h'), c('2s')],
      ],
      firstCard: c('4d'),
    });

    log('p2 plays 8♦ (matches suit of 4♦)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('8d') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: p3 was skipped');
    const skipEvent = r1.events.find(e => e.type === 'PLAYER_SKIPPED');
    expect(skipEvent).toBeDefined();
    expect(skipEvent!.playerId).toBe('p3');

    log('Verify: turn goes to p4 (skipped p3)');
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p4');
  });
});
