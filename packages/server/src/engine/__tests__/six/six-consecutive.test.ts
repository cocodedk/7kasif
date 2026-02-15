import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Six — consecutive 6s', () => {
  it('should apply draw effect each time a 6 is played', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],       // p1
        [c('6d'), c('9c')],       // p2
        [c('6c'), c('Qh')],       // p3 — 6♣ matches value
        [c('3h'), c('2s')],       // p4
      ],
      firstCard: c('4d'),
      remainingDeck: [c('Jh'), c('5c'), c('Kd'), c('8s')],
    });

    log('p2 plays 6♦');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('6d') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: p3 and p4 each drew 1 card');
    let p3 = r1.newState.players.find(p => p.id === 'p3')!;
    let p4 = r1.newState.players.find(p => p.id === 'p4')!;
    expect(p3.hand.length).toBe(3);
    expect(p4.hand.length).toBe(3);

    log('p3 plays 6♣ (matches value of 6♦)');
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('6c') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: p4 (next 1 from p3) drew another card (now 4)');
    p4 = r2.newState.players.find(p => p.id === 'p4')!;
    expect(p4.hand.length).toBe(4); // 3 from before + 1

    log('Verify: p1 (next 2 from p3) drew 1 card (now 3)');
    const p1 = r2.newState.players.find(p => p.id === 'p1')!;
    expect(p1.hand.length).toBe(3); // 2 original + 1

    log('Verify: turn advances to p4');
    expect(r2.newState.players[r2.newState.currentPlayerIndex].id).toBe('p4');
  });
});
