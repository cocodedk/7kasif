import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Eight — four players skip verification', () => {
  it('should skip exactly one player in a 4-player game', () => {
    const state = createTestState({
      hands: [
        [c('8h'), c('5s')],
        [c('Ks'), c('Qh')],
        [c('3d'), c('9c')],
        [c('4c'), c('2s')],
      ],
      firstCard: c('4h'),
      currentPlayerIndex: 0,
    });

    log('p1 plays 8♥ in 4-player game');
    const r1 = applyAction(state, 'p1', { type: 'PLAY_CARD', card: c('8h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: p2 was skipped');
    const skipEvent = r1.events.find(e => e.type === 'PLAYER_SKIPPED');
    expect(skipEvent).toBeDefined();
    expect(skipEvent!.playerId).toBe('p2');

    log('Verify: turn goes to p3 (not p2, not p4)');
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p3');

    log('Verify: only one PLAYER_SKIPPED event');
    const skipEvents = r1.events.filter(e => e.type === 'PLAYER_SKIPPED');
    expect(skipEvents.length).toBe(1);
  });
});
