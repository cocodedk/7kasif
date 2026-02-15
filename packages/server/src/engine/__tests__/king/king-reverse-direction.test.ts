import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('King — reverse direction changes skip target', () => {
  it('should skip and draw the correct player when direction is reversed', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Kh'), c('9c')],
        [c('3d'), c('Qh')],
        [c('6c'), c('2s')],
      ],
      firstCard: c('4h'),
      direction: -1,
      remainingDeck: [c('Jh'), c('5c')],
    });

    log('Direction reversed (-1), p2 plays K♥');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Kh') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: p1 was skipped (next in reverse from p2)');
    const skipEvent = r1.events.find(e => e.type === 'PLAYER_SKIPPED');
    expect(skipEvent!.playerId).toBe('p1');

    log('Verify: p1 drew 1 card (now 3)');
    const p1 = r1.newState.players.find(p => p.id === 'p1')!;
    expect(p1.hand.length).toBe(3);

    log('Verify: turn goes to p4 (skip p1, next in reverse)');
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p4');
  });
});
