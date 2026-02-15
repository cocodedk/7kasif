import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Ten — 8-redirect resolves chain so 10 cannot follow', () => {
  it('after 8-redirect resolves chain, 10 plays as normal card (not in chain)', () => {
    const state = createTestState({
      hands: [
        [c('10h'), c('5s')],      // p1
        [c('7h'), c('9c')],       // p2
        [c('8h'), c('Ks')],       // p3
      ],
      firstCard: c('4h'),
      remainingDeck: [c('Jd'), c('5c')],
    });

    log('p2 plays 7♥ (penalty=2)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 plays 8♥ redirect — p2 draws 2, chain cleared');
    const r2 = applyAction(r1.newState, 'p3', {
      type: 'PLAY_CARD',
      card: c('8h'),
      chainChoice: 'redirect',
    });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: chain is cleared');
    expect(r2.newState.pendingEffect).toBeNull();

    log('Verify: p2 drew 2 cards');
    const p2 = r2.newState.players.find(p => p.id === 'p2')!;
    expect(p2.hand.length).toBe(3); // had 1 (9c) + drew 2

    log('Now p1 plays 10♥ as a normal card (no chain active)');
    const currentPlayer = r2.newState.players[r2.newState.currentPlayerIndex].id;
    expect(currentPlayer).toBe('p1');

    const r3 = applyAction(r2.newState, 'p1', { type: 'PLAY_CARD', card: c('10h') });
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;

    log('Verify: direction reversed (normal 10 effect)');
    expect(r3.newState.direction).toBe(-1);

    log('Verify: no pending chain — this was a standalone 10');
    expect(r3.newState.pendingEffect).toBeNull();
  });
});
