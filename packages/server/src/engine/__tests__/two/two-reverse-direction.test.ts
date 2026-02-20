import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Two — reverse direction, give goes to correct player', () => {
  it('should give card to p1 (next in reverse direction from p2)', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],           // p1 — should receive 9c (next in reverse from p2)
        [c('2h'), c('9c'), c('3d')],  // p2 — plays 2h giving 9c
        [c('6d'), c('Ks')],           // p3
      ],
      firstCard: c('4h'),
      direction: -1,
      currentPlayerIndex: 1,
    });

    log('Direction is reversed (-1), p2 plays 2♥ giving 9♣');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('2h'), giveCard: c('9c') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: p1 received 9♣ (next in reverse direction from p2)');
    const p1 = r1.newState.players.find(p => p.id === 'p1')!;
    expect(p1.hand).toContainEqual(c('9c'));

    log('Verify: p3 did not receive 9♣');
    const p3 = r1.newState.players.find(p => p.id === 'p3')!;
    expect(p3.hand).not.toContainEqual(c('9c'));

    log('Verify: turn advances to p1 (next in reverse direction)');
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p1');
  });
});
