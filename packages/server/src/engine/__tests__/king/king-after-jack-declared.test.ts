import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('King — after Jack with declared suit', () => {
  it('should allow King of declared suit after Jack', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Jc'), c('9h')],
        [c('Kh'), c('3d')],
        [c('6c'), c('2s')],
      ],
      firstCard: c('4d'),
      remainingDeck: [c('Jh'), c('5c')],
    });

    log('p2 plays J♣ declaring hearts');
    const r1 = applyAction(state, 'p2', {
      type: 'PLAY_CARD',
      card: c('Jc'),
      declaredSuit: 'hearts',
    });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 plays K♥ (matches declared suit)');
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('Kh') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: p4 was skipped and drew 1 card');
    const skipEvent = r2.events.find(e => e.type === 'PLAYER_SKIPPED');
    expect(skipEvent!.playerId).toBe('p4');
    const p4 = r2.newState.players.find(p => p.id === 'p4')!;
    expect(p4.hand.length).toBe(3);

    log('Verify: turn goes to p1');
    expect(r2.newState.players[r2.newState.currentPlayerIndex].id).toBe('p1');
  });

  it('should reject King not matching declared suit', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Jc'), c('9h')],
        [c('Ks'), c('3d')],
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

    log('p3 tries K♠ (doesn\'t match declared hearts)');
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('Ks') });
    expect(r2.ok).toBe(false);

    log('Verify: rejected');
  });
});
