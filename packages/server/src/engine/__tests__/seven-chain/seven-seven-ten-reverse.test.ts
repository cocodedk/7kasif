import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Seven — 7 + 7 + 10 reverse', () => {
  it('should reverse direction with accumulated penalty of 4', () => {
    const state = createTestState({
      hands: [
        [c('10d'), c('5s')],      // 10d matches last 7d
        [c('7h'), c('9c')],
        [c('7d'), c('Ks')],
      ],
      firstCard: c('4h'),
    });

    log('p2 plays 7♥ (penalty +2)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 plays 7♦ (penalty +2, now 4 total)');
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('7d') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('p1 plays 10♦ (reverses direction)');
    const r3 = applyAction(r2.newState, 'p1', { type: 'PLAY_CARD', card: c('10d') });
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;

    log('Verify: direction reversed, penalty=4 unchanged, current player=p3');
    expect(r3.newState.direction).toBe(-1);
    expect((r3.newState.pendingEffect as any)?.penalty).toBe(4); // unchanged
    // From p1 (index 0) going backwards = p3 (index 2)
    expect(r3.newState.players[r3.newState.currentPlayerIndex].id).toBe('p3');
  });
});
