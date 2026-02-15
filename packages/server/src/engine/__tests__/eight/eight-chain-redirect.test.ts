import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Eight — chain redirect', () => {
  it('should redirect penalty to player 2 positions ahead', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7h'), c('9c')],
        [c('8h'), c('Ks')],
      ],
      firstCard: c('4h'),
      remainingDeck: [c('Jd'), c('5c')],
    });

    log('p2 plays 7♥ to start chain (penalty=2)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 plays 8♥ with redirect');
    const r2 = applyAction(r1.newState, 'p3', {
      type: 'PLAY_CARD',
      card: c('8h'),
      chainChoice: 'redirect',
    });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: target (2 ahead from p3 = p2) drew 2 cards');
    const p2 = r2.newState.players.find(p => p.id === 'p2')!;
    expect(p2.hand.length).toBe(3); // had 1 (9c) + drew 2

    log('Verify: chain cleared');
    expect(r2.newState.pendingEffect).toBeNull();

    log('Verify: CHAIN_REACTION event targeting p2');
    const chainEvent = r2.events.find(e => e.type === 'CHAIN_REACTION');
    expect(chainEvent).toBeDefined();
    expect(chainEvent!.targetPlayerId).toBe('p2');
  });
});
