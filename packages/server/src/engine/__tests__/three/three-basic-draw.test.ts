import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Three — basic previous player draws', () => {
  it('should make previous player draw 1 card and advance turn', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],       // p1
        [c('3d'), c('9c')],       // p2
        [c('6d'), c('Ks')],       // p3
      ],
      firstCard: c('4d'),
      remainingDeck: [c('Qh')],
    });

    log('p2 plays 3♦ (matches suit)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('3d') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: p1 (previous player) drew 1 card');
    const p1 = r1.newState.players.find(p => p.id === 'p1')!;
    expect(p1.hand.length).toBe(3); // 2 + 1 drawn

    log('Verify: turn advances to p3');
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p3');

    log('Verify: CARD_DRAWN event for p1');
    const drawEvent = r1.events.find(e => e.type === 'CARD_DRAWN');
    expect(drawEvent).toBeDefined();
    if (drawEvent?.type === 'CARD_DRAWN') {
      expect(drawEvent.playerId).toBe('p1');
      expect(drawEvent.count).toBe(1);
    }
  });
});
