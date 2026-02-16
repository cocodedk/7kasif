import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Eight — any suit allowed in freestyle chain', () => {
  it('should allow 8 of different suit during chain in freestyle mode', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7h'), c('9c')],
        [c('8c'), c('Ks')],
      ],
      firstCard: c('4h'),
      mode: 'freestyle',
    });

    log('p2 plays 7♥ to start chain');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 plays 8♣ with redirect (freestyle — any suit ok)');
    const r2 = applyAction(r1.newState, 'p3', {
      type: 'PLAY_CARD',
      card: c('8c'),
      chainChoice: 'redirect',
    });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: redirect accepted, seven-penalty active on target');
    expect(r2.newState.pendingEffect).toEqual({
      type: 'seven-penalty', penalty: 2, drawn: 1, suit: 'hearts',
    });

    // Target (p2, 2 ahead from p3 in 3-player) draws second card then passes
    const r3 = applyAction(r2.newState, 'p2', { type: 'DRAW_CARD' });
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;

    const r4 = applyAction(r3.newState, 'p2', { type: 'PASS_TURN' });
    expect(r4.ok).toBe(true);
    if (!r4.ok) return;

    log('Verify: penalty cleared after pass');
    expect(r4.newState.pendingEffect).toBeNull();
  });
});
