import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('9♦ — non-diamond 9 has no special effect', () => {
  it('should NOT make others draw when 9 of hearts is played', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('9h'), c('Kc')],
        [c('Ks'), c('Qh')],
      ],
      firstCard: c('4h'),
    });

    log('p2 plays 9♥ (not diamonds — no special effect)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('9h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: p1 did NOT draw');
    const p1 = r1.newState.players.find(p => p.id === 'p1')!;
    expect(p1.hand.length).toBe(2);

    log('Verify: p3 did NOT draw');
    const p3 = r1.newState.players.find(p => p.id === 'p3')!;
    expect(p3.hand.length).toBe(2);

    log('Verify: turn advances normally to p3');
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p3');
  });

  it('should NOT make others draw when 9 of clubs is played', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('9c'), c('Kc')],
        [c('Ks'), c('Qh')],
      ],
      firstCard: c('4c'),
    });

    log('p2 plays 9♣ (not diamonds — no special effect)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('9c') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: no one drew');
    const p1 = r1.newState.players.find(p => p.id === 'p1')!;
    const p3 = r1.newState.players.find(p => p.id === 'p3')!;
    expect(p1.hand.length).toBe(2);
    expect(p3.hand.length).toBe(2);
  });
});
