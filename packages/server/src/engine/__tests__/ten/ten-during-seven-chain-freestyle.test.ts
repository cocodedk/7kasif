import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Ten — during seven-chain (freestyle mode)', () => {
  it('should allow 10 of any suit in freestyle chain', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7h'), c('9c')],
        [c('10c'), c('Ks')],
      ],
      firstCard: c('4h'),
      mode: 'freestyle',
    });

    log('p2 plays 7♥ to start chain');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 plays 10♣ (different suit, freestyle — allowed)');
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('10c') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: direction reversed');
    expect(r2.newState.direction).toBe(-1);

    log('Verify: chain still active with penalty=2');
    expect(r2.newState.pendingEffect).not.toBeNull();
    if (r2.newState.pendingEffect?.type === 'seven-chain') {
      expect(r2.newState.pendingEffect.penalty).toBe(2);
    }
  });
});
