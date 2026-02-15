import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Eight — chain add penalty', () => {
  it('should add 3 to penalty and continue chain', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7h'), c('9c')],
        [c('8h'), c('Ks')],
      ],
      firstCard: c('4h'),
    });

    log('p2 plays 7♥ to start chain (penalty=2)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 plays 8♥ with add');
    const r2 = applyAction(r1.newState, 'p3', {
      type: 'PLAY_CARD',
      card: c('8h'),
      chainChoice: 'add',
    });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: penalty increased to 5 (2 + 3)');
    expect(r2.newState.pendingEffect).not.toBeNull();
    expect(r2.newState.pendingEffect!.type).toBe('seven-chain');
    if (r2.newState.pendingEffect!.type === 'seven-chain') {
      expect(r2.newState.pendingEffect!.penalty).toBe(5);
    }

    log('Verify: turn advanced to p1');
    expect(r2.newState.players[r2.newState.currentPlayerIndex].id).toBe('p1');
  });
});
