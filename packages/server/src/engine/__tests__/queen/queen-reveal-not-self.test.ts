import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Queen — does not reveal playing player', () => {
  it('should not add any revealed cards to the player who played the queen', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],       // p1
        [c('Qd'), c('9c')],       // p2
        [c('6d'), c('Ks')],       // p3
      ],
      firstCard: c('4d'),
    });

    log('p2 plays Q♦');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Qd') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: p2 (playing player) has no revealed cards');
    const p2 = r1.newState.players.find(p => p.id === 'p2')!;
    expect(p2.revealedCards.length).toBe(0);

    log('Verify: p1 also has no revealed cards');
    const p1 = r1.newState.players.find(p => p.id === 'p1')!;
    expect(p1.revealedCards.length).toBe(0);
  });
});
