import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Seven — any suit 10 in freestyle mode', () => {
  it('should allow 10 of any suit in freestyle mode', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7h'), c('9c')],
        [c('10c'), c('Ks')],
      ],
      firstCard: c('4h'),
      mode: 'freestyle',
    });

    log('p2 plays 7♥');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 plays 10♣ (different suit, but freestyle allows any suit 10)');
    // 10c — different suit, but freestyle allows it
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('10c') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: direction reversed to -1, penalty=2');
    expect(r2.newState.direction).toBe(-1);
    expect((r2.newState.pendingEffect as any)?.penalty).toBe(2);
  });
});
