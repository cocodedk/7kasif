import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Ten — chain boomerang (penalty comes back to 7-player)', () => {
  it('should send penalty back to the player who started the chain', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7h'), c('9c')],
        [c('10h'), c('Ks')],
      ],
      firstCard: c('4h'),
      remainingDeck: [c('Jd'), c('5c')],
    });

    log('p2 plays 7♥ (penalty=2, turn → p3)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 plays 10♥ — reverses direction, turn → p2');
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('10h') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r2.newState.players[r2.newState.currentPlayerIndex].id).toBe('p2');

    log('p2 has no chain card — draws 2 (penalty)');
    const r3 = applyAction(r2.newState, 'p2', { type: 'DRAW_CARD' });
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;

    log('Verify: p2 drew 2 cards (penalty)');
    const p2 = r3.newState.players.find(p => p.id === 'p2')!;
    expect(p2.hand.length).toBe(3); // had 1 (9c) + drew 2

    log('Verify: chain cleared');
    expect(r3.newState.pendingEffect).toBeNull();
  });
});
