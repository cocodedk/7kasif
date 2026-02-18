import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Seven — two 7s then draw 4', () => {
  it('should draw 4 cards when accepting a penalty of 4', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7h'), c('9c')],
        [c('7d'), c('Ks')],
      ],
      firstCard: c('4h'),
      remainingDeck: [c('Qd'), c('2c'), c('3s'), c('6s')],
    });

    log('p2 plays 7♥');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 plays 7♦');
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('7d') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    // p1 accepts penalty of 4 by drawing
    log('p1 draws 1st card (transitions to seven-penalty)');
    const r3 = applyAction(r2.newState, 'p1', { type: 'DRAW_CARD' });
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;
    expect(r3.newState.pendingEffect).toEqual({ type: 'seven-penalty', penalty: 4, drawn: 1, suit: 'diamonds' });
    expect(r3.newState.players.find(p => p.id === 'p1')!.hand.length).toBe(3);

    log('p1 draws 2nd card');
    const r4 = applyAction(r3.newState, 'p1', { type: 'DRAW_CARD' });
    expect(r4.ok).toBe(true);
    if (!r4.ok) return;

    log('p1 draws 3rd card');
    const r5 = applyAction(r4.newState, 'p1', { type: 'DRAW_CARD' });
    expect(r5.ok).toBe(true);
    if (!r5.ok) return;

    log('p1 draws 4th card (completes mandatory penalty)');
    const r6 = applyAction(r5.newState, 'p1', { type: 'DRAW_CARD' });
    expect(r6.ok).toBe(true);
    if (!r6.ok) return;
    expect(r6.newState.pendingEffect).toEqual({ type: 'seven-penalty', penalty: 4, drawn: 4, suit: 'diamonds' });
    expect(r6.newState.players.find(p => p.id === 'p1')!.hand.length).toBe(6);

    log('p1 passes (clears effect, advances turn)');
    const r7 = applyAction(r6.newState, 'p1', { type: 'PASS_TURN' });
    expect(r7.ok).toBe(true);
    if (!r7.ok) return;
    expect(r7.newState.pendingEffect).toBeNull();
  });
});
