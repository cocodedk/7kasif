import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Ten — 8-redirect resolves chain so 10 cannot follow', () => {
  it('after 8-redirect resolves chain, 10 plays as normal card (not in chain)', () => {
    const state = createTestState({
      hands: [
        [c('10h'), c('5s')],      // p1
        [c('7h'), c('9c')],       // p2
        [c('8h'), c('Ks')],       // p3
      ],
      firstCard: c('4h'),
      remainingDeck: [c('Jd'), c('5c')],
    });

    log('p2 plays 7♥ (penalty=2)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 plays 8♥ redirect — turn moves to p2, p2 draws 1 card');
    const r2 = applyAction(r1.newState, 'p3', {
      type: 'PLAY_CARD',
      card: c('8h'),
      chainChoice: 'redirect',
    });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: p2 is now current player');
    expect(r2.newState.players[r2.newState.currentPlayerIndex].id).toBe('p2');

    log('Verify: p2 drew 1 card');
    let p2 = r2.newState.players.find(p => p.id === 'p2')!;
    expect(p2.hand.length).toBe(2); // had 1 (9c) + 1 drawn

    log('Verify: seven-penalty effect active');
    expect(r2.newState.pendingEffect).toEqual({
      type: 'seven-penalty',
      penalty: 2,
      drawn: 1,
      suit: 'hearts',
    });

    log('p2 draws second card');
    const r3 = applyAction(r2.newState, 'p2', { type: 'DRAW_CARD' });
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;

    log('Verify: p2 now has 3 cards');
    p2 = r3.newState.players.find(p => p.id === 'p2')!;
    expect(p2.hand.length).toBe(3); // 1 original + 2 drawn

    log('Verify: seven-penalty updated');
    expect(r3.newState.pendingEffect).toEqual({
      type: 'seven-penalty',
      penalty: 2,
      drawn: 2,
      suit: 'hearts',
    });

    log('p2 passes to clear penalty');
    const r4 = applyAction(r3.newState, 'p2', { type: 'PASS_TURN' });
    expect(r4.ok).toBe(true);
    if (!r4.ok) return;

    log('Verify: chain is cleared');
    expect(r4.newState.pendingEffect).toBeNull();

    log('Verify: turn moved to p3 after p2 passed');
    expect(r4.newState.players[r4.newState.currentPlayerIndex].id).toBe('p3');

    log('p3 draws a card (Ks cannot be played on 8h)');
    const r5 = applyAction(r4.newState, 'p3', { type: 'DRAW_CARD' });
    expect(r5.ok).toBe(true);
    if (!r5.ok) return;

    log('p3 passes turn');
    const r6 = applyAction(r5.newState, 'p3', { type: 'PASS_TURN' });
    expect(r6.ok).toBe(true);
    if (!r6.ok) return;

    log('Now p1 plays 10♥ as a normal card (no chain active)');
    const currentPlayer = r6.newState.players[r6.newState.currentPlayerIndex].id;
    expect(currentPlayer).toBe('p1');

    const r7 = applyAction(r6.newState, 'p1', { type: 'PLAY_CARD', card: c('10h') });
    expect(r7.ok).toBe(true);
    if (!r7.ok) return;

    log('Verify: direction reversed (normal 10 effect)');
    expect(r7.newState.direction).toBe(-1);

    log('Verify: no pending chain — this was a standalone 10');
    expect(r7.newState.pendingEffect).toBeNull();
  });
});
