import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Ace — then play 3 of matching suit', () => {
  it('should trigger 3 effect (prev player draws) after ace chain resolves', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Ah'), c('3h'), c('9c')],
        [c('6d'), c('Ks')],
      ],
      firstCard: c('4h'),
      remainingDeck: [c('Qd'), c('2c')],
    });

    log('p2 plays A♥');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Ah') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p2 plays 3♥ (matching suit)');
    const r2 = applyAction(r1.newState, 'p2', { type: 'PLAY_CARD', card: c('3h') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: Ace chain cleared');
    expect(r2.newState.pendingEffect).toBeNull();

    log('Verify: p1 draws 1 card (3\'s effect)');
    // 3's effect: previous player draws 1
    // p2 is at index 1, previous is p1 (index 0)
    const p1 = r2.newState.players.find(p => p.id === 'p1')!;
    expect(p1.hand.length).toBe(3); // 2 + 1 from 3's effect

    log('Verify: Turn advances to p3');
    expect(r2.newState.players[r2.newState.currentPlayerIndex].id).toBe('p3');
  });
});
