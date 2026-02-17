import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Draw — allowed during chain even after a normal draw', () => {
  it('should allow ace-chain draw even if hasDrawnThisTurn is true', () => {
    const state = createTestState({
      hands: [
        [c('Ah'), c('4s')],       // p1 — will draw, then play ace
        [c('9c'), c('Ks')],       // p2
      ],
      firstCard: c('3h'),
      currentPlayerIndex: 0,
    });

    log('p1 draws a card');
    const r1 = applyAction(state, 'p1', { type: 'DRAW_CARD' });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    expect(r1.newState.hasDrawnThisTurn).toBe(true);

    log('p1 plays A♥ — ace chain starts, turn stays on p1');
    const r2 = applyAction(r1.newState, 'p1', { type: 'PLAY_CARD', card: c('Ah') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r2.newState.pendingEffect?.type).toBe('ace-chain');
    expect(r2.newState.hasDrawnThisTurn).toBe(true);

    log('p1 draws to break ace chain — should succeed despite hasDrawnThisTurn');
    const r3 = applyAction(r2.newState, 'p1', { type: 'DRAW_CARD' });
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;
    expect(r3.newState.pendingEffect).toBeNull();
  });

  it('should allow seven-chain draw even if hasDrawnThisTurn is true', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],       // p1
        [c('9c'), c('Ks')],       // p2
      ],
      firstCard: c('3h'),
      currentPlayerIndex: 0,
    });

    // Simulate: p1 drew, then a 7-chain arrived (e.g. from prior play)
    state.hasDrawnThisTurn = true;
    state.pendingEffect = { type: 'seven-chain', penalty: 2, suit: 'hearts' };

    log('p1 draws to accept seven-chain — should succeed despite hasDrawnThisTurn');
    const r1 = applyAction(state, 'p1', { type: 'DRAW_CARD' });
    expect(r1.ok).toBe(true);
  });
});
