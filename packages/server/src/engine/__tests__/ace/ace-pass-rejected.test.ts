import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Ace — pass rejected', () => {
  it('should reject pass during ace chain — must play or draw', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Ah'), c('9c')],
        [c('6d'), c('Ks')],
      ],
      firstCard: c('4h'),
    });

    log('p2 plays A♥');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Ah') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p2 attempts to pass during ace chain');
    const r2 = applyAction(r1.newState, 'p2', { type: 'PASS_TURN' });
    log('Verify: pass is rejected during ace chain');
    expect(r2.ok).toBe(false);
    if (!r2.ok) {
      expect(r2.reason).toContain('ace chain');
    }
  });
});
