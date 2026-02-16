import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Eight — chain redirect in 4-player game', () => {
  it('should redirect penalty to correct player (2 ahead)', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7h'), c('9c')],
        [c('8h'), c('Ks')],
        [c('3d'), c('2s')],
      ],
      firstCard: c('4h'),
      remainingDeck: [c('Jd'), c('5c')],
    });

    log('p2 plays 7♥ to start chain (penalty=2)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 plays 8♥ redirect — target is 2 ahead from p3 = p1');
    const r2 = applyAction(r1.newState, 'p3', {
      type: 'PLAY_CARD',
      card: c('8h'),
      chainChoice: 'redirect',
    });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: CHAIN_REACTION targets p1');
    const chainEvent = r2.events.find(e => e.type === 'CHAIN_REACTION');
    expect(chainEvent).toBeDefined();
    expect(chainEvent!.targetPlayerId).toBe('p1');

    log('Verify: p1 drew 1 card, pendingEffect is seven-penalty, p1 is current player');
    const p1 = r2.newState.players.find(p => p.id === 'p1')!;
    expect(p1.hand.length).toBe(3); // had 2 + 1 drawn
    expect(r2.newState.pendingEffect).toEqual({
      type: 'seven-penalty',
      penalty: 2,
      drawn: 1,
      suit: 'hearts',
    });
    const currentPlayer = r2.newState.players[r2.newState.currentPlayerIndex].id;
    expect(currentPlayer).toBe('p1');

    log('p1 draws again');
    const r3 = applyAction(r2.newState, 'p1', { type: 'DRAW_CARD' });
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;

    log('Verify: p1 has 4 cards, seven-penalty drawn:2');
    const p1After = r3.newState.players.find(p => p.id === 'p1')!;
    expect(p1After.hand.length).toBe(4);
    expect(r3.newState.pendingEffect).toEqual({
      type: 'seven-penalty',
      penalty: 2,
      drawn: 2,
      suit: 'hearts',
    });

    log('p1 passes to end turn');
    const r4 = applyAction(r3.newState, 'p1', { type: 'PASS_TURN' });
    expect(r4.ok).toBe(true);
    if (!r4.ok) return;

    log('Verify: pendingEffect null, turn advanced');
    expect(r4.newState.pendingEffect).toBeNull();

    log('Verify: p4 did NOT draw');
    const p4 = r4.newState.players.find(p => p.id === 'p4')!;
    expect(p4.hand.length).toBe(2);
  });
});
