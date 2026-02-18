import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Queen — correct target when direction reversed', () => {
  it('should set pendingEffect for next player in reverse direction', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],       // p1
        [c('Qd'), c('9c')],       // p2
        [c('6d'), c('Ks')],       // p3
      ],
      firstCard: c('4d'),
      direction: -1,
      currentPlayerIndex: 1,
    });

    log('p2 plays Q♦ with direction = -1');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Qd') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: pendingEffect targets p1 (next in reverse)');
    expect(r1.newState.pendingEffect).toEqual({ type: 'queen-reveal', targetPlayerId: 'p1' });

    log('Verify: turn advances to p1');
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p1');

    log('p1 reveals a card');
    const r2 = applyAction(r1.newState, 'p1', { type: 'REVEAL_CARD', card: c('4s') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: p1 has 1 revealed card');
    const p1 = r2.newState.players.find(p => p.id === 'p1')!;
    expect(p1.revealedCards.length).toBe(1);

    log('Verify: p3 has no revealed cards');
    const p3 = r2.newState.players.find(p => p.id === 'p3')!;
    expect(p3.revealedCards.length).toBe(0);

    log('Verify: CARD_REVEALED event for p1');
    const revealEvent = r2.events.find(e => e.type === 'CARD_REVEALED');
    expect(revealEvent).toBeDefined();
    if (revealEvent?.type === 'CARD_REVEALED') {
      expect(revealEvent.playerId).toBe('p1');
    }
  });
});
