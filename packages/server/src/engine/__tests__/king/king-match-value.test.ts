import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('King — match by value', () => {
  it('should allow King matching value of King on discard', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Kc'), c('9h')],
        [c('3d'), c('Qh')],
      ],
      firstCard: c('Kd'),
      remainingDeck: [c('Jh'), c('5c')],
    });

    log('p2 plays K♣ (matches value of K♦ on discard)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Kc') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: p3 was skipped and drew 1 card');
    const skipEvent = r1.events.find(e => e.type === 'PLAYER_SKIPPED');
    expect(skipEvent!.playerId).toBe('p3');
    const p3 = r1.newState.players.find(p => p.id === 'p3')!;
    expect(p3.hand.length).toBe(3);

    log('Verify: turn wraps to p1');
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p1');
  });
});
