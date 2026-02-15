import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Eight — after Jack with declared suit', () => {
  it('should allow 8 of declared suit after Jack', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Jc'), c('9h')],
        [c('8h'), c('Ks')],
        [c('3d'), c('2s')],
      ],
      firstCard: c('4d'),
    });

    log('p2 plays J♣ declaring hearts');
    const r1 = applyAction(state, 'p2', {
      type: 'PLAY_CARD',
      card: c('Jc'),
      declaredSuit: 'hearts',
    });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 plays 8♥ (matches declared suit)');
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('8h') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: p4 was skipped');
    const skipEvent = r2.events.find(e => e.type === 'PLAYER_SKIPPED');
    expect(skipEvent).toBeDefined();
    expect(skipEvent!.playerId).toBe('p4');

    log('Verify: turn goes to p1');
    expect(r2.newState.players[r2.newState.currentPlayerIndex].id).toBe('p1');
  });

  it('should reject 8 not matching declared suit', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Jc'), c('9h')],
        [c('8s'), c('Ks')],
      ],
      firstCard: c('4d'),
    });

    log('p2 plays J♣ declaring hearts');
    const r1 = applyAction(state, 'p2', {
      type: 'PLAY_CARD',
      card: c('Jc'),
      declaredSuit: 'hearts',
    });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 tries 8♠ (doesn\'t match declared hearts)');
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('8s') });
    expect(r2.ok).toBe(false);
    log('Verify: rejected');
  });
});
