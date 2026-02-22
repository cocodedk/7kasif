import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Draw — limited to one per turn', () => {
  it('should reject a second draw in the same turn', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],       // p1
        [c('9c'), c('Ks')],       // p2
      ],
      firstCard: c('3h'),
      currentPlayerIndex: 0,
    });

    log('p1 draws once — should succeed');
    const r1 = applyAction(state, 'p1', { type: 'DRAW_CARD' });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p1 draws again — should be rejected');
    const r2 = applyAction(r1.newState, 'p1', { type: 'DRAW_CARD' });
    expect(r2.ok).toBe(false);
    if (r2.ok) return;
    expect(r2.reason).toBe('Already drew a card this turn');
  });

  it('should allow drawing again on the next turn', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],       // p1
        [c('9c'), c('Ks')],       // p2
      ],
      firstCard: c('3h'),
      currentPlayerIndex: 0,
    });

    log('p1 draws');
    const r1 = applyAction(state, 'p1', { type: 'DRAW_CARD' });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p1 passes');
    const r2 = applyAction(r1.newState, 'p1', { type: 'PASS_TURN' });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('p2 draws and passes');
    const r3 = applyAction(r2.newState, 'p2', { type: 'DRAW_CARD' });
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;
    const r4 = applyAction(r3.newState, 'p2', { type: 'PASS_TURN' });
    expect(r4.ok).toBe(true);
    if (!r4.ok) return;

    log('p1 can draw again on new turn');
    const r5 = applyAction(r4.newState, 'p1', { type: 'DRAW_CARD' });
    expect(r5.ok).toBe(true);
  });

  it('should allow multiple draws during seven-penalty', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],       // p1
        [c('9c'), c('Ks')],       // p2
      ],
      firstCard: c('3h'),
      currentPlayerIndex: 0,
      pendingEffect: { type: 'seven-penalty', penalty: 2, drawn: 0, suit: 'hearts' },
    });

    log('p1 draws first penalty card');
    const r1 = applyAction(state, 'p1', { type: 'DRAW_CARD' });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p1 draws second penalty card');
    const r2 = applyAction(r1.newState, 'p1', { type: 'DRAW_CARD' });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('p1 draws optional extra card');
    const r3 = applyAction(r2.newState, 'p1', { type: 'DRAW_CARD' });
    expect(r3.ok).toBe(true);
  });
});
