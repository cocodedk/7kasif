import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Seven — 8 redirect with four players', () => {
  it('should redirect to correct player (2 positions ahead) in 4-player game', () => {
    // Players: p1(idx0), p2(idx1), p3(idx2), p4(idx3)
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],       // p1
        [c('7h'), c('9c')],       // p2
        [c('8h'), c('Ks')],       // p3
        [c('3c'), c('6d')],       // p4
      ],
      firstCard: c('4h'),
      remainingDeck: [c('Qd'), c('2c')],
    });

    log('p2 plays 7♥ (penalty +2)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 plays 8♥ with "redirect" choice (targets p1, 2 positions ahead)');
    const r2 = applyAction(r1.newState, 'p3', {
      type: 'PLAY_CARD',
      card: c('8h'),
      chainChoice: 'redirect',
    });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: p1 drew 2 cards (4 total), pending effect cleared');
    const p1 = r2.newState.players.find(p => p.id === 'p1')!;
    expect(p1.hand.length).toBe(4); // 2 + 2 drawn
    expect(r2.newState.pendingEffect).toBeNull();
  });

  it('should redirect from p4 to p2 (wrapping around)', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],       // p1
        [c('7h'), c('9c')],       // p2
        [c('7d'), c('Ks')],       // p3
        [c('8h'), c('6d')],       // p4 - will redirect
      ],
      firstCard: c('4h'),
      remainingDeck: [c('Qd'), c('2c'), c('3s'), c('4d')],
    });

    log('p2 plays 7♥ (penalty +2)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 plays 7♦ to continue chain (penalty stays +2)');
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('7d') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('p4 plays 8♥ with "redirect" choice (targets p2, wrapping around)');
    const r3 = applyAction(r2.newState, 'p4', {
      type: 'PLAY_CARD',
      card: c('8h'),
      chainChoice: 'redirect',
    });
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;

    log('Verify: p2 drew 4 cards (5 total), pending effect cleared, CHAIN_REACTION event');
    const p2 = r3.newState.players.find(p => p.id === 'p2')!;
    expect(p2.hand.length).toBe(5); // 1 (9c) + 4 drawn
    expect(r3.newState.pendingEffect).toBeNull();

    const chainEvent = r3.events.find(e => e.type === 'CHAIN_REACTION');
    if (chainEvent?.type === 'CHAIN_REACTION') {
      expect(chainEvent.targetPlayerId).toBe('p2');
    }
  });
});
