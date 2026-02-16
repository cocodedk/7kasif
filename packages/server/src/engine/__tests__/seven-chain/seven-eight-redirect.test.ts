import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Seven — 8 redirect', () => {
  it('should redirect penalty to player 2 positions ahead', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7h'), c('9c')],
        [c('8h'), c('Ks')],
        [c('3c'), c('6d')],
      ],
      firstCard: c('4h'),
      remainingDeck: [c('Qd'), c('2c')],
    });

    log('p2 plays 7♥');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    // p3 redirects with 8h
    log('p3 plays 8♥ (redirect)');
    const r2 = applyAction(r1.newState, 'p3', {
      type: 'PLAY_CARD',
      card: c('8h'),
      chainChoice: 'redirect',
    });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    // Redirect target is 2 ahead of p3 = p1 (index: 2+2=4 mod 4 = 0)
    log('Verify: p1 draws 1 card, pendingEffect is seven-penalty, p1 is current player');
    const p1_after_redirect = r2.newState.players.find(p => p.id === 'p1')!;
    expect(p1_after_redirect.hand.length).toBe(3); // 2 + 1
    expect(r2.newState.pendingEffect).toEqual({
      type: 'seven-penalty',
      penalty: 2,
      drawn: 1,
      suit: 'hearts',
    });
    expect(r2.newState.players[r2.newState.currentPlayerIndex].id).toBe('p1');

    // Chain reaction event with correct target
    log('Verify: chain event targets p1 with penalty=2');
    const chainEvent = r2.events.find(e => e.type === 'CHAIN_REACTION');
    if (chainEvent?.type === 'CHAIN_REACTION') {
      expect(chainEvent.targetPlayerId).toBe('p1');
      expect(chainEvent.penalty).toBe(2);
    }

    // p1 draws another card
    log('p1 draws again');
    const r3 = applyAction(r2.newState, 'p1', { type: 'DRAW_CARD' });
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;

    const p1_after_draw = r3.newState.players.find(p => p.id === 'p1')!;
    expect(p1_after_draw.hand.length).toBe(4); // 2 + 2
    expect(r3.newState.pendingEffect).toEqual({
      type: 'seven-penalty',
      penalty: 2,
      drawn: 2,
      suit: 'hearts',
    });

    // p1 passes (drawn >= penalty satisfied)
    log('p1 passes');
    const r4 = applyAction(r3.newState, 'p1', { type: 'PASS_TURN' });
    expect(r4.ok).toBe(true);
    if (!r4.ok) return;

    expect(r4.newState.pendingEffect).toBeNull();
  });
});
