import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Seven — 7 + 8 add + 7', () => {
  it('should accumulate: 2 + 3 + 2 = 7 penalty', () => {
    const state = createTestState({
      hands: [
        [c('7s'), c('5s')],
        [c('7h'), c('9c')],
        [c('8h'), c('Ks')],
        [c('3c'), c('6d')],
      ],
      firstCard: c('4h'),
      remainingDeck: [c('Qd'), c('2c'), c('3s'), c('4d'), c('5d'), c('6s'), c('Qh')],
    });

    log('p2 plays 7♥ (penalty +2)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 plays 8♥ with "add" choice (penalty 2→5)');
    const r2 = applyAction(r1.newState, 'p3', {
      type: 'PLAY_CARD',
      card: c('8h'),
      chainChoice: 'add',
    });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: penalty=5');
    expect((r2.newState.pendingEffect as any)?.penalty).toBe(5);

    log('p4 draws 5 cards (accepts penalty)');
    const r3 = applyAction(r2.newState, 'p4', { type: 'DRAW_CARD' });
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;

    log('Verify: p4 has 7 cards (2 original + 5 drawn), pending effect cleared');
    const p4 = r3.newState.players.find(p => p.id === 'p4')!;
    expect(p4.hand.length).toBe(7); // 2 + 5 drawn
    expect(r3.newState.pendingEffect).toBeNull();
  });

  it('should allow 7 after 8-add to continue chain', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7h'), c('9c')],
        [c('8h'), c('Ks')],
        [c('7c'), c('6d')],
      ],
      firstCard: c('4h'),
    });

    log('p2 plays 7♥ (penalty +2)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 plays 8♥ with "add" choice (penalty 2→5)');
    const r2 = applyAction(r1.newState, 'p3', {
      type: 'PLAY_CARD',
      card: c('8h'),
      chainChoice: 'add',
    });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('p4 plays 7♣ to continue chain (penalty 5→7)');
    const r3 = applyAction(r2.newState, 'p4', { type: 'PLAY_CARD', card: c('7c') });
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;

    log('Verify: penalty=7, current player=p1');
    expect((r3.newState.pendingEffect as any)?.penalty).toBe(7); // 5 + 2
    expect(r3.newState.players[r3.newState.currentPlayerIndex].id).toBe('p1');
  });
});
