import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Three — after Jack with declared suit', () => {
  it('should allow 3 of declared suit after Jack', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],       // p1
        [c('Jc'), c('9h')],       // p2
        [c('3h'), c('Ks')],       // p3
      ],
      firstCard: c('4d'),
      remainingDeck: [c('Qd')],
    });

    log('p2 plays J♣ declaring hearts');
    const r1 = applyAction(state, 'p2', {
      type: 'PLAY_CARD',
      card: c('Jc'),
      declaredSuit: 'hearts',
    });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 plays 3♥ (matches declared suit hearts)');
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('3h') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: p2 (previous of p3) drew 1 card');
    const p2 = r2.newState.players.find(p => p.id === 'p2')!;
    expect(p2.hand.length).toBe(2); // 1 (9h) + 1 drawn

    log('Verify: turn advances to p1');
    expect(r2.newState.players[r2.newState.currentPlayerIndex].id).toBe('p1');
  });

  it('should reject 3 not matching declared suit', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],       // p1
        [c('Jc'), c('9h')],       // p2
        [c('3s'), c('Ks')],       // p3
      ],
      firstCard: c('4d'),
    });

    log('p2 plays J♣ declaring hearts');
    const r1 = applyAction(state, 'p2', {
      type: 'PLAY_CARD',
      card: c('Jc'),
      declaredSuit: 'hearts',
    });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 tries 3♠ (doesn\'t match declared hearts or Jack value)');
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('3s') });
    expect(r2.ok).toBe(false);
    log('Verify: rejected — does not match house');
  });
});
