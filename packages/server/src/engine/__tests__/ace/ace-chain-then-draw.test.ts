import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Ace — chain two aces then draw', () => {
  it('should clear chain and advance turn after chaining aces then drawing', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Ah'), c('Ad'), c('9c')],
        [c('6d'), c('Ks')],
      ],
      firstCard: c('4h'),
      remainingDeck: [c('Qd')],
    });

    log('p2 plays A♥');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Ah') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p2 plays A♦ to chain');
    const r2 = applyAction(r1.newState, 'p2', { type: 'PLAY_CARD', card: c('Ad') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: 2-ace chain active');
    expect(r2.newState.pendingEffect).toEqual({ type: 'ace-chain', suit: 'diamonds', acesPlayed: 2 });

    log('p2 draws a card (no matching suit)');
    // p2 has only 9c left which doesn't match diamonds — draw
    const r3 = applyAction(r2.newState, 'p2', { type: 'DRAW_CARD' });
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;

    log('Verify: chain cleared, player stays on turn');
    expect(r3.newState.pendingEffect).toBeNull();
    expect(r3.newState.players[r3.newState.currentPlayerIndex].id).toBe('p2');
    const p2 = r3.newState.players.find(p => p.id === 'p2')!;
    expect(p2.hand.length).toBe(2); // 9c + drawn card

    log('p2 passes to end turn');
    const r4 = applyAction(r3.newState, 'p2', { type: 'PASS_TURN' });
    expect(r4.ok).toBe(true);
    if (!r4.ok) return;
    expect(r4.newState.players[r4.newState.currentPlayerIndex].id).toBe('p3');
  });
});
