import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Seven — 8 redirect with four players', () => {
  it('should redirect to correct player (2 positions ahead) in 4-player game', () => {
    // Players: p1(idx0), p2(idx1), p3(idx2), p4(idx3)
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],       // p1
        [c('7h'), c('9c')],       // p2
        [c('8h'), c('Ks')],       // p3
        [c('3c'), c('6d')],       // p4
      ],
      firstCard: c('4h'),
      remainingDeck: [c('Qd'), c('2c')],
    });

    log('p2 plays 7♥ (penalty +2)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 plays 8♥ with "redirect" choice (targets p1, 2 positions ahead)');
    const r2 = applyAction(r1.newState, 'p3', {
      type: 'PLAY_CARD',
      card: c('8h'),
      chainChoice: 'redirect',
    });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: p1 becomes current, drew 1 card (3 total), seven-penalty active');
    let p1 = r2.newState.players.find(p => p.id === 'p1')!;
    expect(p1.hand.length).toBe(3);
    expect(r2.newState.players[r2.newState.currentPlayerIndex].id).toBe('p1');
    expect(r2.newState.pendingEffect).toMatchObject({
      type: 'seven-penalty',
      penalty: 2,
      drawn: 1,
      suit: 'hearts',
    });

    log('p1 draws again');
    const r3 = applyAction(r2.newState, 'p1', { type: 'DRAW_CARD' });
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;

    log('Verify: p1 has 4 cards, can now pass');
    p1 = r3.newState.players.find(p => p.id === 'p1')!;
    expect(p1.hand.length).toBe(4);

    log('p1 passes');
    const r4 = applyAction(r3.newState, 'p1', { type: 'PASS_TURN' });
    if (!r4.ok) {
      log(`Pass failed: ${r4.reason}`);
    }
    expect(r4.ok).toBe(true);
    if (!r4.ok) return;

    log('Verify: pending effect cleared');
    expect(r4.newState.pendingEffect).toBeNull();
  });

  it('should redirect from p4 to p2 (wrapping around)', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],       // p1
        [c('7h'), c('9c')],       // p2
        [c('7d'), c('Ks')],       // p3
        [c('8d'), c('6d')],       // p4 - will redirect (8d matches last 7d)
      ],
      firstCard: c('4h'),
      remainingDeck: [c('Qd'), c('2c'), c('3s'), c('4d')],
    });

    log('p2 plays 7♥ (penalty +2)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 plays 7♦ to continue chain (penalty increases to +4)');
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('7d') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('p4 plays 8♦ with "redirect" choice (targets p2, wrapping around)');
    const r3 = applyAction(r2.newState, 'p4', {
      type: 'PLAY_CARD',
      card: c('8d'),
      chainChoice: 'redirect',
    });
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;

    log('Verify: p2 becomes current, drew 1 card (2 total), CHAIN_REACTION event, seven-penalty active');
    let p2 = r3.newState.players.find(p => p.id === 'p2')!;
    expect(p2.hand.length).toBe(2);
    expect(r3.newState.players[r3.newState.currentPlayerIndex].id).toBe('p2');
    expect(r3.newState.pendingEffect).toMatchObject({
      type: 'seven-penalty',
      penalty: 4,
      drawn: 1,
      suit: 'diamonds',
    });

    const chainEvent = r3.events.find(e => e.type === 'CHAIN_REACTION');
    expect(chainEvent).toBeDefined();
    if (chainEvent?.type === 'CHAIN_REACTION') {
      expect(chainEvent.targetPlayerId).toBe('p2');
    }

    log('p2 draws 3 more times');
    const r4 = applyAction(r3.newState, 'p2', { type: 'DRAW_CARD' });
    expect(r4.ok).toBe(true);
    if (!r4.ok) return;

    const r5 = applyAction(r4.newState, 'p2', { type: 'DRAW_CARD' });
    expect(r5.ok).toBe(true);
    if (!r5.ok) return;

    const r6 = applyAction(r5.newState, 'p2', { type: 'DRAW_CARD' });
    expect(r6.ok).toBe(true);
    if (!r6.ok) return;

    log('Verify: p2 has 5 cards, can now pass');
    p2 = r6.newState.players.find(p => p.id === 'p2')!;
    expect(p2.hand.length).toBe(5);

    log('p2 passes');
    const r7 = applyAction(r6.newState, 'p2', { type: 'PASS_TURN' });
    if (!r7.ok) {
      log(`Pass failed: ${r7.reason}`);
    }
    expect(r7.ok).toBe(true);
    if (!r7.ok) return;

    log('Verify: pending effect cleared');
    expect(r7.newState.pendingEffect).toBeNull();
  });
});
