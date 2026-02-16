import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Seven — draw penalty with deck recycle', () => {
  it('should recycle discard pile when deck runs out during penalty draw', () => {
    // Set up state with a pre-existing seven-chain so we don't need to play a 7 first
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7d'), c('Ks')],       // p2
        [c('6d'), c('9c')],       // p3
      ],
      firstCard: c('7h'),         // 7h on discard
      remainingDeck: [c('Qd'), c('2c')], // only 2 cards in deck
      currentPlayerIndex: 1,
      pendingEffect: { type: 'seven-chain', penalty: 4, suit: 'hearts' },
    });

    // Add extra cards to discard pile for recycling
    state.discardPile.push(c('3s'), c('6s'), c('5d'));

    log('p2 draw 1/4 (transitions to seven-penalty)');
    const r1 = applyAction(state, 'p2', { type: 'DRAW_CARD' });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    expect(r1.newState.pendingEffect).toEqual({ type: 'seven-penalty', penalty: 4, drawn: 1, suit: 'hearts' });
    expect(r1.newState.players.find(p => p.id === 'p2')!.hand.length).toBe(3);

    log('p2 draw 2/4');
    const r2 = applyAction(r1.newState, 'p2', { type: 'DRAW_CARD' });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r2.newState.pendingEffect).toEqual({ type: 'seven-penalty', penalty: 4, drawn: 2, suit: 'hearts' });
    expect(r2.newState.players.find(p => p.id === 'p2')!.hand.length).toBe(4);

    log('p2 draw 3/4 (deck should recycle here)');
    const r3 = applyAction(r2.newState, 'p2', { type: 'DRAW_CARD' });
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;
    expect(r3.newState.pendingEffect).toEqual({ type: 'seven-penalty', penalty: 4, drawn: 3, suit: 'hearts' });
    expect(r3.newState.players.find(p => p.id === 'p2')!.hand.length).toBe(5);

    log('p2 draw 4/4');
    const r4 = applyAction(r3.newState, 'p2', { type: 'DRAW_CARD' });
    expect(r4.ok).toBe(true);
    if (!r4.ok) return;
    expect(r4.newState.pendingEffect).toEqual({ type: 'seven-penalty', penalty: 4, drawn: 4, suit: 'hearts' });
    expect(r4.newState.players.find(p => p.id === 'p2')!.hand.length).toBe(6);

    log('p2 passes (penalty complete)');
    const r5 = applyAction(r4.newState, 'p2', { type: 'PASS_TURN' });
    expect(r5.ok).toBe(true);
    if (!r5.ok) return;
    expect(r5.newState.pendingEffect).toBeNull();
    expect(r5.newState.players.find(p => p.id === 'p2')!.hand.length).toBe(6);
    // Discard pile should have at least the top card remaining
    expect(r5.newState.discardPile.length).toBeGreaterThanOrEqual(1);
  });

  it('should handle drawing penalty when deck has exactly enough cards', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7h'), c('9c')],
        [c('6d'), c('Ks')],
      ],
      firstCard: c('4h'),
      remainingDeck: [c('Qd'), c('2c')],
    });

    log('p2 plays 7♥ (penalty +2)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 draw 1/2 (transitions to seven-penalty)');
    const r2 = applyAction(r1.newState, 'p3', { type: 'DRAW_CARD' });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r2.newState.pendingEffect).toEqual({ type: 'seven-penalty', penalty: 2, drawn: 1, suit: 'hearts' });
    expect(r2.newState.players.find(p => p.id === 'p3')!.hand.length).toBe(3);

    log('p3 draw 2/2');
    const r3 = applyAction(r2.newState, 'p3', { type: 'DRAW_CARD' });
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;
    expect(r3.newState.pendingEffect).toEqual({ type: 'seven-penalty', penalty: 2, drawn: 2, suit: 'hearts' });
    expect(r3.newState.players.find(p => p.id === 'p3')!.hand.length).toBe(4);

    log('p3 passes (penalty complete)');
    const r4 = applyAction(r3.newState, 'p3', { type: 'PASS_TURN' });
    expect(r4.ok).toBe(true);
    if (!r4.ok) return;
    expect(r4.newState.pendingEffect).toBeNull();
    expect(r4.newState.players.find(p => p.id === 'p3')!.hand.length).toBe(4);
  });
});
