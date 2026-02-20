import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Two — basic give card to next player', () => {
  it('should give card to next player and advance turn', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],           // p1
        [c('2h'), c('9c'), c('3d')],  // p2 — will play 2h giving 9c
        [c('6d'), c('Ks')],           // p3
      ],
      firstCard: c('4h'),
      currentPlayerIndex: 1,
    });

    log('p2 plays 2♥ giving 9♣ to p3');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('2h'), giveCard: c('9c') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: p2 hand has 1 card (3♦)');
    const p2 = r1.newState.players.find(p => p.id === 'p2')!;
    expect(p2.hand).toHaveLength(1);
    expect(p2.hand[0]).toEqual(c('3d'));

    log('Verify: p3 received 9♣');
    const p3 = r1.newState.players.find(p => p.id === 'p3')!;
    expect(p3.hand).toContainEqual(c('9c'));

    log('Verify: turn advances to p3');
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p3');
  });
});
