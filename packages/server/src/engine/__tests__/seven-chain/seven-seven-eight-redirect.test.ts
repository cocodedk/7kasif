import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Seven — 7 + 7 + 8 redirect', () => {
  it('should redirect accumulated penalty of 4 to target player', () => {
    // 3-player game so after p2→p3 play 7s, turn goes to p1
    const state = createTestState({
      hands: [
        [c('8d'), c('5s')],       // p1 (8d matches last 7d)
        [c('7h'), c('9c')],       // p2
        [c('7d'), c('Ks')],       // p3
      ],
      firstCard: c('4h'),
      remainingDeck: [c('Qd'), c('2c'), c('3s'), c('4d')],
    });

    log('p2 plays 7♥');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 plays 7♦ (adds 2 to penalty: 2+2=4)');
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('7d') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: turn goes to p1');
    // In 3-player: p1→p2→p3→p1. After p3, turn goes to p1
    expect(r2.newState.players[r2.newState.currentPlayerIndex].id).toBe('p1');

    log('p1 plays 8♦ and redirects penalty to p3 (2 positions ahead)');
    // p1 (idx 0) redirects with 8d (matches last 7d) — target is 2 ahead = idx 2 = p3
    const r3 = applyAction(r2.newState, 'p1', {
      type: 'PLAY_CARD',
      card: c('8d'),
      chainChoice: 'redirect',
    });
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;

    log('Verify: p3 becomes current player, has 2 cards (1 original + 1 drawn), pendingEffect is seven-penalty');
    expect(r3.newState.players[r3.newState.currentPlayerIndex].id).toBe('p3');
    const p3_after_redirect = r3.newState.players.find(p => p.id === 'p3')!;
    expect(p3_after_redirect.hand.length).toBe(2); // 1 (Ks) + 1 drawn
    expect(r3.newState.pendingEffect).toEqual({
      type: 'seven-penalty',
      penalty: 4,
      drawn: 1,
      suit: 'diamonds',
    });

    log('Verify: chain reaction event with target p3, penalty 4');
    const chainEvent = r3.events.find(e => e.type === 'CHAIN_REACTION');
    expect(chainEvent).toBeDefined();
    if (chainEvent?.type === 'CHAIN_REACTION') {
      expect(chainEvent.targetPlayerId).toBe('p3');
      expect(chainEvent.penalty).toBe(4);
    }

    log('p3 draws 3 more cards (drawn: 1→2→3→4)');
    const r4 = applyAction(r3.newState, 'p3', { type: 'DRAW_CARD' });
    expect(r4.ok).toBe(true);
    if (!r4.ok) return;
    const r5 = applyAction(r4.newState, 'p3', { type: 'DRAW_CARD' });
    expect(r5.ok).toBe(true);
    if (!r5.ok) return;
    const r6 = applyAction(r5.newState, 'p3', { type: 'DRAW_CARD' });
    expect(r6.ok).toBe(true);
    if (!r6.ok) return;

    log('Verify: p3 has 5 cards total (1 original + 4 drawn)');
    const p3_after_draws = r6.newState.players.find(p => p.id === 'p3')!;
    expect(p3_after_draws.hand.length).toBe(5);

    log('p3 passes to end turn');
    const r7 = applyAction(r6.newState, 'p3', { type: 'PASS_TURN' });
    expect(r7.ok).toBe(true);
    if (!r7.ok) return;

    log('Verify: pendingEffect cleared, turn moves to next player');
    expect(r7.newState.pendingEffect).toBeNull();
    expect(r7.newState.players[r7.newState.currentPlayerIndex].id).toBe('p1');
  });
});
