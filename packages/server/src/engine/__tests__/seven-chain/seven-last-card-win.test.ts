import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Seven — last card deferred win', () => {
  it('playing 7 as last card should NOT immediately win — chain continues', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7h')],
        [c('6d'), c('Ks')],
      ],
      firstCard: c('4h'),
      remainingDeck: [c('Qd'), c('2c'), c('3s')],
    });

    log('p2 plays 7♥ as last card');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: game NOT finished, chain active, pendingWinner set');
    expect(r1.newState.phase).toBe('playing');
    expect(r1.newState.pendingEffect).toEqual({ type: 'seven-chain', penalty: 2, suit: 'hearts' });
    expect(r1.newState.pendingWinner).toEqual({ playerId: 'p2', card: c('7h') });
    expect(r1.events.find(e => e.type === 'GAME_OVER')).toBeUndefined();
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p3');
  });

  it('chain resolves (opponent draws + passes) → deferred winner wins', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7h')],
        [c('6d'), c('Ks')],
      ],
      firstCard: c('4h'),
      remainingDeck: [c('Qd'), c('2c'), c('3s')],
    });

    log('p2 plays 7♥ as last card');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 draws (accepts chain penalty)');
    const r2 = applyAction(r1.newState, 'p3', { type: 'DRAW_CARD' });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r2.newState.pendingEffect).toEqual({ type: 'seven-penalty', penalty: 2, drawn: 1, suit: 'hearts' });

    log('p3 draws second card');
    const r3 = applyAction(r2.newState, 'p3', { type: 'DRAW_CARD' });
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;

    log('p3 passes — chain resolved');
    const r4 = applyAction(r3.newState, 'p3', { type: 'PASS_TURN' });
    expect(r4.ok).toBe(true);
    if (!r4.ok) return;

    log('Verify: game finished, p2 wins');
    expect(r4.newState.phase).toBe('finished');
    const gameOver = r4.events.find(e => e.type === 'GAME_OVER');
    expect(gameOver).toBeDefined();
    if (gameOver?.type === 'GAME_OVER') {
      expect(gameOver.winnerId).toBe('p2');
      expect(gameOver.points).toBe(1);
    }
  });

  it('playing 8 as last card during chain should defer win', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7h'), c('9c')],
        [c('8h')],        // p3 will play 8♥ as chain counter, last card
        [c('6d'), c('Ks')],
      ],
      firstCard: c('4h'),
      currentPlayerIndex: 1,
      remainingDeck: [c('Qd'), c('2c'), c('3s'), c('Jc'), c('4d')],
    });

    log('p2 plays 7♥ (starts chain)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 plays 8♥ as last card (add to chain)');
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('8h'), chainChoice: 'add' });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: game NOT finished, chain continues, pendingWinner=p3');
    expect(r2.newState.phase).toBe('playing');
    expect(r2.newState.pendingWinner).toEqual({ playerId: 'p3', card: c('8h') });
    expect(r2.newState.pendingEffect).toEqual({ type: 'seven-chain', penalty: 5, suit: 'hearts' });
    expect(r2.events.find(e => e.type === 'GAME_OVER')).toBeUndefined();

    log('p4 draws (accepts chain)');
    const r3 = applyAction(r2.newState, 'p4', { type: 'DRAW_CARD' });
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;

    // Draw remaining penalty cards
    let s = r3.newState;
    for (let i = 1; i < 5; i++) {
      const r = applyAction(s, 'p4', { type: 'DRAW_CARD' });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      s = r.newState;
    }

    log('p4 passes — chain resolved');
    const rPass = applyAction(s, 'p4', { type: 'PASS_TURN' });
    expect(rPass.ok).toBe(true);
    if (!rPass.ok) return;

    log('Verify: game finished, p3 wins');
    expect(rPass.newState.phase).toBe('finished');
    const gameOver = rPass.events.find(e => e.type === 'GAME_OVER');
    expect(gameOver).toBeDefined();
    if (gameOver?.type === 'GAME_OVER') {
      expect(gameOver.winnerId).toBe('p3');
    }
  });

  it('playing 10 as last card during chain should defer win', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7h'), c('9c')],
        [c('10h')],        // p3 will play 10♥ as chain counter, last card
        [c('6d'), c('Ks')],
      ],
      firstCard: c('4h'),
      currentPlayerIndex: 1,
      remainingDeck: [c('Qd'), c('2c'), c('3s'), c('Jc')],
    });

    log('p2 plays 7♥ (starts chain)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 plays 10♥ as last card (reverse chain)');
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('10h') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: game NOT finished, chain continues, pendingWinner=p3');
    expect(r2.newState.phase).toBe('playing');
    expect(r2.newState.pendingWinner).toEqual({ playerId: 'p3', card: c('10h') });
    expect(r2.newState.pendingEffect).toEqual({ type: 'seven-chain', penalty: 2, suit: 'hearts' });
    expect(r2.events.find(e => e.type === 'GAME_OVER')).toBeUndefined();

    // Direction reversed, so chain goes back to p2
    log('p2 draws (accepts chain)');
    const r3 = applyAction(r2.newState, 'p2', { type: 'DRAW_CARD' });
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;

    const r4 = applyAction(r3.newState, 'p2', { type: 'DRAW_CARD' });
    expect(r4.ok).toBe(true);
    if (!r4.ok) return;

    log('p2 passes — chain resolved');
    const r5 = applyAction(r4.newState, 'p2', { type: 'PASS_TURN' });
    expect(r5.ok).toBe(true);
    if (!r5.ok) return;

    log('Verify: game finished, p3 wins');
    expect(r5.newState.phase).toBe('finished');
    const gameOver = r5.events.find(e => e.type === 'GAME_OVER');
    expect(gameOver).toBeDefined();
    if (gameOver?.type === 'GAME_OVER') {
      expect(gameOver.winnerId).toBe('p3');
    }
  });

  it('chain wraps back to pending winner (they draw) → pendingWinner cleared, game continues', () => {
    // p2 plays 7 as last card, p3 plays 10 to reverse, chain goes back to p2
    // p2 must draw — they no longer have empty hand, pendingWinner cleared
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7h')],          // p2 plays 7♥ as last card
        [c('10h'), c('Ks')], // p3 will reverse chain with 10♥
        [c('6d'), c('Qs')],
      ],
      firstCard: c('4h'),
      currentPlayerIndex: 1,
      remainingDeck: [c('Qd'), c('2c'), c('3s'), c('Jc')],
    });

    log('p2 plays 7♥ as last card');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    expect(r1.newState.pendingWinner).toEqual({ playerId: 'p2', card: c('7h') });

    log('p3 plays 10♥ (reverse chain back to p2)');
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('10h') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    // Direction reversed, chain bounces back to p2
    expect(r2.newState.players[r2.newState.currentPlayerIndex].id).toBe('p2');

    log('p2 draws (accepts chain — they get cards, pendingWinner should be cleared)');
    const r3 = applyAction(r2.newState, 'p2', { type: 'DRAW_CARD' });
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;

    log('Verify: pendingWinner cleared, game continues');
    expect(r3.newState.pendingWinner).toBeNull();
    expect(r3.newState.phase).toBe('playing');
    expect(r3.newState.players.find(p => p.id === 'p2')!.hand.length).toBeGreaterThan(0);
  });
});
