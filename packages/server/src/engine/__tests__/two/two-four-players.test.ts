import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Two — four players, give goes to correct next player', () => {
  it('should give card to p3 (next after p2) in 4-player game', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],           // p1
        [c('2h'), c('9c'), c('3d')],  // p2 — plays 2h giving 9c
        [c('6d'), c('Ks')],           // p3 — should receive 9c
        [c('7s'), c('Qd')],           // p4
      ],
      firstCard: c('4h'),
      currentPlayerIndex: 1,
    });

    log('p2 plays 2♥ giving 9♣ to p3');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('2h'), giveCard: c('9c') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: p3 received 9♣');
    const p3 = r1.newState.players.find(p => p.id === 'p3')!;
    expect(p3.hand).toContainEqual(c('9c'));

    log('Verify: p4 did not receive 9♣');
    const p4 = r1.newState.players.find(p => p.id === 'p4')!;
    expect(p4.hand).not.toContainEqual(c('9c'));

    log('Verify: turn advances to p3');
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p3');
  });
});
