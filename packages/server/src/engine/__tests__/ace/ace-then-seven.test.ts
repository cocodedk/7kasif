import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Ace — then play 7 of matching suit', () => {
  it('should start a 7-chain after ace chain resolves with matching 7', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Ah'), c('7h'), c('9c')],
        [c('6d'), c('Ks')],
      ],
      firstCard: c('4h'),
      remainingDeck: [c('Qd'), c('2c'), c('3s')],
    });

    log('p2 plays A♥');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Ah') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p2 plays 7♥ (matching suit)');
    const r2 = applyAction(r1.newState, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: 7-chain started with penalty=2');
    expect(r2.newState.pendingEffect).toEqual({ type: 'seven-chain', penalty: 2, suit: 'hearts' });
    log('Verify: Turn advances to p3');
    expect(r2.newState.players[r2.newState.currentPlayerIndex].id).toBe('p3');
  });
});
