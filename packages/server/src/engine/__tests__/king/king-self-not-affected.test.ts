import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('King — player who plays is not affected', () => {
  it('should not skip or draw the playing player', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Kd'), c('9c')],
        [c('3h'), c('Qh')],
      ],
      firstCard: c('4d'),
      remainingDeck: [c('Jh'), c('5c')],
    });

    log('p2 plays K♦');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Kd') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: p2 did NOT draw (only played, now has 1 card)');
    const p2 = r1.newState.players.find(p => p.id === 'p2')!;
    expect(p2.hand.length).toBe(1);

    log('Verify: skipped player is p3, not p2');
    const skipEvent = r1.events.find(e => e.type === 'PLAYER_SKIPPED');
    expect(skipEvent!.playerId).toBe('p3');
    expect(skipEvent!.playerId).not.toBe('p2');
  });
});
