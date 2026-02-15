import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Ace — chain then play matching suit', () => {
  it('should resolve chain when playing a card matching last ace suit', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Ah'), c('Ad'), c('5d'), c('9c')],
        [c('6d'), c('Ks')],
      ],
      firstCard: c('4h'),
    });

    log('p2 plays A♥');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Ah') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p2 plays A♦');
    const r2 = applyAction(r1.newState, 'p2', { type: 'PLAY_CARD', card: c('Ad') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    // Last ace suit is diamonds — play 5d
    log('p2 plays 5♦ (matching last ace suit)');
    const r3 = applyAction(r2.newState, 'p2', { type: 'PLAY_CARD', card: c('5d') });
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;

    log('Verify: chain cleared, p3 turn');
    expect(r3.newState.pendingEffect).toBeNull();
    expect(r3.newState.players[r3.newState.currentPlayerIndex].id).toBe('p3');
  });

  it('should reject a card not matching the last ace suit', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Ah'), c('Ad'), c('5c'), c('9c')],
        [c('6d'), c('Ks')],
      ],
      firstCard: c('4h'),
    });

    log('p2 plays A♥');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Ah') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p2 plays A♦');
    const r2 = applyAction(r1.newState, 'p2', { type: 'PLAY_CARD', card: c('Ad') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    // Last ace suit is diamonds — 5c (clubs) should fail
    log('p2 tries 5♣ (should fail - not diamonds)');
    const r3 = applyAction(r2.newState, 'p2', { type: 'PLAY_CARD', card: c('5c') });
    log('Verify: play rejected');
    expect(r3.ok).toBe(false);
  });
});
