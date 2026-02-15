import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Seven — any suit 8 in freestyle mode', () => {
  it('should allow 8 of any suit in freestyle mode', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7h'), c('9c')],
        [c('8c'), c('Ks')],
      ],
      firstCard: c('4h'),
      mode: 'freestyle',
    });

    log('p2 plays 7♥');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 plays 8♣ (different suit, but freestyle allows any suit 8)');
    // 8c — different suit, but freestyle allows it
    const r2 = applyAction(r1.newState, 'p3', {
      type: 'PLAY_CARD',
      card: c('8c'),
      chainChoice: 'add',
    });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: penalty=5 (2 from 7 + 3 from 8)');
    expect((r2.newState.pendingEffect as any)?.penalty).toBe(5); // 2 + 3
  });
});
