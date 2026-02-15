import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Eight — player who plays is not skipped', () => {
  it('should not skip the playing player themselves', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('8d'), c('9c')],
        [c('Ks'), c('Qh')],
      ],
      firstCard: c('4d'),
    });

    log('p2 plays 8♦');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('8d') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: p2 is NOT the skipped player');
    const skipEvent = r1.events.find(e => e.type === 'PLAYER_SKIPPED');
    expect(skipEvent).toBeDefined();
    expect(skipEvent!.playerId).not.toBe('p2');

    log('Verify: skipped player is p3 (next after p2)');
    expect(skipEvent!.playerId).toBe('p3');
  });
});
