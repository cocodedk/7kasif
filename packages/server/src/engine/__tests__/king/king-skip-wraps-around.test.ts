import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('King — skip wraps around', () => {
  it('should wrap around when skipped player is last in order', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Ks'), c('9c')],
        [c('Kd'), c('Qh')],
      ],
      firstCard: c('4d'),
      currentPlayerIndex: 2,
      remainingDeck: [c('Jh'), c('5c')],
    });

    log('p3 plays K♦ — skips p1 (who also draws), turn goes to p2');
    const r1 = applyAction(state, 'p3', { type: 'PLAY_CARD', card: c('Kd') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: p1 was skipped');
    const skipEvent = r1.events.find(e => e.type === 'PLAYER_SKIPPED');
    expect(skipEvent!.playerId).toBe('p1');

    log('Verify: p1 drew 1 card (now 3)');
    const p1 = r1.newState.players.find(p => p.id === 'p1')!;
    expect(p1.hand.length).toBe(3);

    log('Verify: turn goes to p2');
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p2');
  });
});
