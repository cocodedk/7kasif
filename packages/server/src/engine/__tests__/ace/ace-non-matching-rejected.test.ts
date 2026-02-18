import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Ace — non-matching card rejected', () => {
  it('should reject a card that does not match the ace suit', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Ah'), c('9c'), c('3d')],
        [c('6d'), c('Ks')],
      ],
      firstCard: c('4h'),
    });

    log('p2 plays A♥');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Ah') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p2 attempts to play 9♣ (non-matching suit)');
    // 9c does not match hearts — should fail
    const r2 = applyAction(r1.newState, 'p2', { type: 'PLAY_CARD', card: c('9c') });
    log('Verify: play rejected (non-matching suit)');
    expect(r2.ok).toBe(false);
    if (r2.ok) return;
    expect(r2.reason).toContain('Must play an Ace, a Jack, or a card of hearts');
  });

  it('should reject a card not matching suit even if it matches discard value', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Ad'), c('5c'), c('3d')],
        [c('6d'), c('Ks')],
      ],
      firstCard: c('5d'),
    });

    log('p2 plays A♦');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Ad') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p2 attempts to play 5♣ (non-matching suit despite value match)');
    // 5c doesn't match diamonds suit — should fail even though 5 matches nothing relevant
    const r2 = applyAction(r1.newState, 'p2', { type: 'PLAY_CARD', card: c('5c') });
    log('Verify: play rejected (suit mismatch overrides value)');
    expect(r2.ok).toBe(false);
  });
});
