import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Queen — consecutive reveals do not duplicate', () => {
  it('should allow two consecutive queens with player-chosen reveals', () => {
    const state = createTestState({
      hands: [
        [c('Qh'), c('5s')],              // p1
        [c('Qd'), c('9c'), c('Ks')],     // p2
        [c('6h'), c('8s')],              // p3
      ],
      firstCard: c('3h'),
      currentPlayerIndex: 0,
    });

    log('p1 plays Q♥ (matches suit of 3♥) — sets pendingEffect for p2');
    const r1 = applyAction(state, 'p1', { type: 'PLAY_CARD', card: c('Qh') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    expect(r1.newState.pendingEffect).toEqual({ type: 'queen-reveal', targetPlayerId: 'p2' });

    log('p2 reveals K♠ (choosing not to reveal Q♦)');
    const r2 = applyAction(r1.newState, 'p2', { type: 'REVEAL_CARD', card: c('Ks') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    const p2After1 = r2.newState.players.find(p => p.id === 'p2')!;
    expect(p2After1.revealedCards.length).toBe(1);
    expect(p2After1.revealedCards[0]).toEqual(c('Ks'));

    log('p2 plays Q♦ (matches value of Q♥) — sets pendingEffect for p3');
    const r3 = applyAction(r2.newState, 'p2', { type: 'PLAY_CARD', card: c('Qd') });
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;

    expect(r3.newState.pendingEffect).toEqual({ type: 'queen-reveal', targetPlayerId: 'p3' });

    log('p3 reveals 8♠');
    const r4 = applyAction(r3.newState, 'p3', { type: 'REVEAL_CARD', card: c('8s') });
    expect(r4.ok).toBe(true);
    if (!r4.ok) return;

    const p3After = r4.newState.players.find(p => p.id === 'p3')!;
    expect(p3After.revealedCards.length).toBe(1);

    log('Verify: p2 still has 1 revealed from first queen');
    const p2After2 = r4.newState.players.find(p => p.id === 'p2')!;
    expect(p2After2.revealedCards.length).toBe(1);

    log('Verify: p1 has no revealed cards (was not targeted)');
    const p1After = r4.newState.players.find(p => p.id === 'p1')!;
    expect(p1After.revealedCards.length).toBe(0);
  });
});
