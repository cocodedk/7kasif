import { describe, it, expect, vi } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Queen — consecutive reveals do not duplicate', () => {
  it('should reveal different cards when two queens target the same player', () => {
    // Mock Math.random so the queen reveal picks the last unrevealed card
    // (index 2 = Ks from p2's hand, index 1 = 8s from p3's hand),
    // ensuring Q♦ is never the revealed card (which would block p2 from playing it).
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const state = createTestState({
      hands: [
        [c('Qh'), c('5s')],              // p1
        [c('Qd'), c('9c'), c('Ks')],     // p2 — has a queen to play back
        [c('6h'), c('8s')],              // p3
      ],
      firstCard: c('3h'),
      currentPlayerIndex: 0,
    });

    log('p1 plays Q♥ (matches suit of 3♥) — reveals a card from p2');
    const r1 = applyAction(state, 'p1', { type: 'PLAY_CARD', card: c('Qh') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    const p2After1 = r1.newState.players.find(p => p.id === 'p2')!;
    expect(p2After1.revealedCards.length).toBe(1);

    log('p2 plays Q♦ (matches value of Q♥) — reveals a card from p3');
    const r2 = applyAction(r1.newState, 'p2', { type: 'PLAY_CARD', card: c('Qd') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    const p3After = r2.newState.players.find(p => p.id === 'p3')!;
    expect(p3After.revealedCards.length).toBe(1);

    log('Verify: p2 still has 1 revealed from first queen');
    const p2After2 = r2.newState.players.find(p => p.id === 'p2')!;
    expect(p2After2.revealedCards.length).toBe(1);

    log('Verify: p1 has no revealed cards (was not targeted)');
    const p1After = r2.newState.players.find(p => p.id === 'p1')!;
    expect(p1After.revealedCards.length).toBe(0);

    vi.restoreAllMocks();
  });
});
