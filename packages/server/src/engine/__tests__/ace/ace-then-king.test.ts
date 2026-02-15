import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Ace — then play King of matching suit', () => {
  it('should trigger King effect (skip + draw) after ace chain resolves', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Ah'), c('Kh'), c('9c')],
        [c('6d'), c('Ks')],
        [c('3c'), c('Qd')],
      ],
      firstCard: c('4h'),
      remainingDeck: [c('2c'), c('5d')],
    });

    log('p2 plays A♥');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Ah') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p2 plays K♥ (matching suit)');
    // p2 plays King of hearts (matching suit) — resolves ace, applies King effect
    const r2 = applyAction(r1.newState, 'p2', { type: 'PLAY_CARD', card: c('Kh') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: Ace chain cleared');
    // Ace chain cleared
    expect(r2.newState.pendingEffect).toBeNull();

    log('Verify: p3 draws 1 card (King effect)');
    // King effect: skip p3 (next player) + p3 draws 1
    const p3 = r2.newState.players.find(p => p.id === 'p3')!;
    expect(p3.hand.length).toBe(3); // 2 + 1 drawn

    log('Verify: PLAYER_SKIPPED event recorded');
    // Skipped event
    const skipEvent = r2.events.find(e => e.type === 'PLAYER_SKIPPED');
    expect(skipEvent).toBeDefined();

    log('Verify: Turn goes to p4 (p3 was skipped)');
    // Turn goes to p4 (p3 was skipped)
    expect(r2.newState.players[r2.newState.currentPlayerIndex].id).toBe('p4');
  });
});
