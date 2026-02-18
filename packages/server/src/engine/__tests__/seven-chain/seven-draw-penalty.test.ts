import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Seven — draw penalty', () => {
  it('should force next player to draw 2 when they accept the chain', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7h'), c('9c')],
        [c('6d'), c('Ks')],
      ],
      firstCard: c('4h'),
      remainingDeck: [c('Qd'), c('2c')],
    });

    log('p2 plays 7♥');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    expect(r1.newState.pendingEffect).toEqual({ type: 'seven-chain', penalty: 2, suit: 'hearts' });
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p3');

    // p3 draws first card — accepts penalty, transitions to seven-penalty
    log('p3 draws first card (accepts penalty)');
    const r2 = applyAction(r1.newState, 'p3', { type: 'DRAW_CARD' });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    let p3 = r2.newState.players.find(p => p.id === 'p3')!;
    log('Verify: p3 has 3 cards, seven-penalty active, drawn=1, still p3 turn');
    expect(p3.hand.length).toBe(3); // 2 original + 1 drawn
    expect(r2.newState.pendingEffect).toEqual({ type: 'seven-penalty', penalty: 2, drawn: 1, suit: 'hearts' });
    expect(r2.newState.players[r2.newState.currentPlayerIndex].id).toBe('p3');

    // Chain reaction event
    const chainEvent = r2.events.find(e => e.type === 'CHAIN_REACTION');
    expect(chainEvent).toBeDefined();
    if (chainEvent?.type === 'CHAIN_REACTION') {
      expect(chainEvent.penalty).toBe(2);
      expect(chainEvent.targetPlayerId).toBe('p3');
    }

    // p3 draws second card — completes mandatory penalty draws
    log('p3 draws second card');
    const r3 = applyAction(r2.newState, 'p3', { type: 'DRAW_CARD' });
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;

    p3 = r3.newState.players.find(p => p.id === 'p3')!;
    log('Verify: p3 has 4 cards, seven-penalty active, drawn=2, still p3 turn');
    expect(p3.hand.length).toBe(4); // 2 original + 2 drawn
    expect(r3.newState.pendingEffect).toEqual({ type: 'seven-penalty', penalty: 2, drawn: 2, suit: 'hearts' });
    expect(r3.newState.players[r3.newState.currentPlayerIndex].id).toBe('p3');

    // p3 passes — ends turn
    log('p3 passes');
    const r4 = applyAction(r3.newState, 'p3', { type: 'PASS_TURN' });
    expect(r4.ok).toBe(true);
    if (!r4.ok) return;

    log('Verify: chain ended, turn advances to p1');
    expect(r4.newState.pendingEffect).toBeNull();
    expect(r4.newState.players[r4.newState.currentPlayerIndex].id).toBe('p1');
  });
});
