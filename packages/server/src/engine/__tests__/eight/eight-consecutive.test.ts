import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Eight — consecutive 8s', () => {
  it('should skip again when another 8 is played next', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('8d'), c('9c')],
        [c('Ks'), c('Qh')],
        [c('8c'), c('2s')],
      ],
      firstCard: c('4d'),
    });

    log('p2 plays 8♦ — skips p3, turn to p4');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('8d') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p4');

    log('p4 plays 8♣ (matches value) — skips p1, turn to p2');
    const r2 = applyAction(r1.newState, 'p4', { type: 'PLAY_CARD', card: c('8c') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: p1 was skipped');
    const skipEvent = r2.events.find(e => e.type === 'PLAYER_SKIPPED');
    expect(skipEvent).toBeDefined();
    expect(skipEvent!.playerId).toBe('p1');

    log('Verify: turn goes to p2');
    expect(r2.newState.players[r2.newState.currentPlayerIndex].id).toBe('p2');
  });
});
