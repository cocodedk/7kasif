import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Ace — chain two aces', () => {
  it('should keep same player turn with acesPlayed=2 after chaining two aces', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Ah'), c('Ad'), c('3d')],
        [c('6d'), c('Ks')],
      ],
      firstCard: c('4h'),
    });

    // p2 plays first ace
    log('p2 plays A♥');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Ah') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: ace chain active with acesPlayed=1');
    expect(r1.newState.pendingEffect).toEqual({ type: 'ace-chain', suit: 'hearts', acesPlayed: 1 });

    // p2 plays second ace
    log('p2 plays A♦');
    const r2 = applyAction(r1.newState, 'p2', { type: 'PLAY_CARD', card: c('Ad') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    // Still p2's turn, acesPlayed=2, suit updated to diamonds
    log('Verify: chain continues with acesPlayed=2, suit diamonds, p2 turn');
    expect(r2.newState.players[r2.newState.currentPlayerIndex].id).toBe('p2');
    expect(r2.newState.pendingEffect).toEqual({ type: 'ace-chain', suit: 'diamonds', acesPlayed: 2 });
  });
});
