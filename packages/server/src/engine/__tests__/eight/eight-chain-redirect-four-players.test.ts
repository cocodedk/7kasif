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

    log('Verify: p1 (2 ahead from p3) drew 2 cards');
    const p1 = r2.newState.players.find(p => p.id === 'p1')!;
    expect(p1.hand.length).toBe(4); // had 2 + drew 2

    log('Verify: p4 did NOT draw');
    const p4 = r2.newState.players.find(p => p.id === 'p4')!;
    expect(p4.hand.length).toBe(2);

    log('Verify: CHAIN_REACTION targets p1');
    const chainEvent = r2.events.find(e => e.type === 'CHAIN_REACTION');
    expect(chainEvent).toBeDefined();
    expect(chainEvent!.targetPlayerId).toBe('p1');
  });
});
