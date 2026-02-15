import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Ten — during seven-chain (standard mode)', () => {
  it('should allow 10 of matching suit and reverse direction in chain', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7h'), c('9c')],
        [c('10h'), c('Ks')],
      ],
      firstCard: c('4h'),
      remainingDeck: [c('Jd'), c('5c')],
    });

    log('p2 plays 7♥ to start chain (penalty=2)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 plays 10♥ (matches chain suit) — reverses direction');
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('10h') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: direction reversed to -1');
    expect(r2.newState.direction).toBe(-1);

    log('Verify: penalty unchanged at 2');
    expect(r2.newState.pendingEffect).not.toBeNull();
    if (r2.newState.pendingEffect?.type === 'seven-chain') {
      expect(r2.newState.pendingEffect.penalty).toBe(2);
    }

    log('Verify: turn goes to p2 (counter-clockwise from p3)');
    expect(r2.newState.players[r2.newState.currentPlayerIndex].id).toBe('p2');
  });

  it('should reject 10 of wrong suit in standard chain', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7h'), c('9c')],
        [c('10c'), c('Ks')],
      ],
      firstCard: c('4h'),
    });

    log('p2 plays 7♥ to start chain');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 tries 10♣ (wrong suit, standard mode)');
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('10c') });
    expect(r2.ok).toBe(false);
    log('Verify: rejected');
  });
});
