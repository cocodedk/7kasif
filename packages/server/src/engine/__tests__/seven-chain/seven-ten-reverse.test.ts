import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Seven — 10 reverse', () => {
  it('should reverse direction while keeping penalty', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7h'), c('9c')],
        [c('10h'), c('Ks')],
      ],
      firstCard: c('4h'),
    });

    log('p2 plays 7♥');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    expect(r1.newState.direction).toBe(1);

    log('p3 plays 10♥ to reverse direction');
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('10h') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: direction reversed to -1, penalty unchanged at 2');
    expect(r2.newState.direction).toBe(-1);
    expect((r2.newState.pendingEffect as any)?.penalty).toBe(2); // unchanged
    // After reverse, next from p3 going backwards = p2
    expect(r2.newState.players[r2.newState.currentPlayerIndex].id).toBe('p2');

    log('Verify: DIRECTION_REVERSED event emitted');
    const reversedEvent = r2.events.find(e => e.type === 'DIRECTION_REVERSED');
    expect(reversedEvent).toBeDefined();
  });
});
