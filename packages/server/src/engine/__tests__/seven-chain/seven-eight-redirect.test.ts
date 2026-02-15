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
    log('Verify: penalty redirected to p1, p1 has 4 cards');
    const p1 = r2.newState.players.find(p => p.id === 'p1')!;
    expect(p1.hand.length).toBe(4); // 2 + 2 penalty drawn
    expect(r2.newState.pendingEffect).toBeNull();

    // Chain reaction event with correct target
    log('Verify: chain event targets p1 with penalty=2');
    const chainEvent = r2.events.find(e => e.type === 'CHAIN_REACTION');
    if (chainEvent?.type === 'CHAIN_REACTION') {
      expect(chainEvent.targetPlayerId).toBe('p1');
      expect(chainEvent.penalty).toBe(2);
    }
  });
});
