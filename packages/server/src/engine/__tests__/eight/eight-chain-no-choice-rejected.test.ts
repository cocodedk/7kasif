import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Eight — chain without chainChoice rejected', () => {
  it('should reject 8 in chain when chainChoice is not specified', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7h'), c('9c')],
        [c('8h'), c('Ks')],
      ],
      firstCard: c('4h'),
    });

    log('p2 plays 7♥ to start chain');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 tries 8♥ without chainChoice');
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('8h') });
    expect(r2.ok).toBe(false);
    if (r2.ok) return;

    log('Verify: rejected — must specify chainChoice');
    expect(r2.reason).toContain('chainChoice');
  });
});
