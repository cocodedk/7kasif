import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Ace — play matching value (not suit)', () => {
  it('should reject a card matching discard value but not ace suit', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Ah'), c('4d'), c('9c')],
        [c('6d'), c('Ks')],
      ],
      firstCard: c('4h'),
    });

    // p2 plays Ace of hearts — ace chain starts with suit=hearts
    log('p2 plays A♥');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Ah') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    // Try to play 4d — matches the discard pile value (the ace? no, the ace is on top)
    // Actually during ace-chain, canPlayOnAce checks: ace or matching suit
    // 4d does not match hearts suit and is not an ace → should fail
    log('p2 tries 4♦ (should fail - not matching suit)');
    const r2 = applyAction(r1.newState, 'p2', { type: 'PLAY_CARD', card: c('4d') });
    log('Verify: play rejected');
    expect(r2.ok).toBe(false);
    if (r2.ok) return;
    expect(r2.reason).toContain('Must play an Ace or a card of hearts');
  });
});
