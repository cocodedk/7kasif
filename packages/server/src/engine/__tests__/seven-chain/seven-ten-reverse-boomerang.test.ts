import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Seven — 10 reverse boomerang', () => {
  it('should send penalty back to the 7-player after 10 reverses direction', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7h'), c('9c')],
        [c('10h'), c('Ks')],
      ],
      firstCard: c('4h'),
      remainingDeck: [c('Qd'), c('2c')],
    });

    log('p2 plays 7♥');
    // p2 plays 7h
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 plays 10♥ to reverse direction');
    // p3 plays 10h — reverse
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('10h') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: direction reversed, penalty bounces back to p2');
    // Direction reversed — next player from p3 going backwards = p2
    expect(r2.newState.players[r2.newState.currentPlayerIndex].id).toBe('p2');
    expect((r2.newState.pendingEffect as any)?.penalty).toBe(2);

    log('p2 draws 2 cards to accept penalty');
    // p2 accepts penalty — draws 2
    const r3 = applyAction(r2.newState, 'p2', { type: 'DRAW_CARD' });
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;

    log('Verify: p2 has 3 cards (1 remaining + 2 penalty), pending effect cleared');
    const p2 = r3.newState.players.find(p => p.id === 'p2')!;
    expect(p2.hand.length).toBe(3); // 1 (9c after playing 7h) + 2 penalty
    expect(r3.newState.pendingEffect).toBeNull();
  });
});
