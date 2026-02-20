import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Two — rejected during seven-chain', () => {
  it('should reject 2 played during active seven-chain', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],  // p1
        [c('7h'), c('9c')],  // p2 — plays 7h to start chain
        [c('2h'), c('Ks')],  // p3 — tries to play 2h during chain
      ],
      firstCard: c('4h'),
      remainingDeck: [c('Qd'), c('3s')],
    });

    log('p2 plays 7♥');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    expect(r1.newState.pendingEffect?.type).toBe('seven-chain');

    log('p3 tries to play 2♥ during seven-chain (should be rejected)');
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('2h'), giveCard: c('Ks') });
    expect(r2.ok).toBe(false);
    if (r2.ok) return;
    log('Verify: action rejected — 2 not allowed during chain');
    expect(r2.reason).toContain('chain reaction');
  });
});
