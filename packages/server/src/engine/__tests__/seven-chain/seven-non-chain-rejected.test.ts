import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Seven — non-chain card rejected', () => {
  it('should reject playing a normal card during seven-chain', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7h'), c('9c')],
        [c('5h'), c('Ks')],
      ],
      firstCard: c('4h'),
    });

    log('p2 plays 7♥');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 tries to play 5♥ (normal card, should be rejected)');
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('5h') });
    expect(r2.ok).toBe(false);
    if (r2.ok) return;
    log('Verify: action rejected — cannot play non-chain card during chain');
    expect(r2.reason).toContain('chain reaction');
  });

  it('should reject ace during seven-chain', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7h'), c('9c')],
        [c('Ah'), c('Ks')],
      ],
      firstCard: c('4h'),
    });

    log('p2 plays 7♥');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 tries to play A♥ (should be rejected)');
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('Ah') });
    log('Verify: action rejected — ace not allowed during chain');
    expect(r2.ok).toBe(false);
  });
});
