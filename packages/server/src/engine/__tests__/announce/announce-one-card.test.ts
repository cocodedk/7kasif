import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Announce — player with 1 card announces successfully', () => {
  it('should set hasAnnouncedOneCard to true after playing down to 1 card', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('4d'), c('9c')],
        [c('9s'), c('Ks')],
      ],
      firstCard: c('4h'),
    });

    log('p2 plays 4d (matches suit of 4h), going down to 1 card');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('4d') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p2 announces one card');
    const r2 = applyAction(r1.newState, 'p2', { type: 'ANNOUNCE_ONE_CARD' });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: p2.hasAnnouncedOneCard is true');
    const p2 = r2.newState.players.find(p => p.id === 'p2')!;
    expect(p2.hasAnnouncedOneCard).toBe(true);
  });
});
