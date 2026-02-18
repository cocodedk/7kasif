import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Ace — draw to end chain', () => {
  it('should clear ace chain and advance turn when drawing', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Ah'), c('9c')],
        [c('6d'), c('Ks')],
      ],
      firstCard: c('4h'),
      remainingDeck: [c('Qd')],
    });

    log('p2 plays A♥');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Ah') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p2 draws a card');
    // p2 draws — can't play matching suit card
    const r2 = applyAction(r1.newState, 'p2', { type: 'DRAW_CARD' });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: ace chain cleared, player stays on turn');
    expect(r2.newState.pendingEffect).toBeNull();
    expect(r2.newState.players[r2.newState.currentPlayerIndex].id).toBe('p2');
    // p2 drew 1 card: had 1 (9c after playing Ah), now 2
    const p2 = r2.newState.players.find(p => p.id === 'p2')!;
    expect(p2.hand.length).toBe(2);

    log('p2 passes to end turn');
    const r3 = applyAction(r2.newState, 'p2', { type: 'PASS_TURN' });
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;
    expect(r3.newState.players[r3.newState.currentPlayerIndex].id).toBe('p3');
  });
});
