import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Ace — play matching suit card', () => {
  it('should allow playing a card matching the ace suit and advance turn', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Ah'), c('3h'), c('9c')],
        [c('6d'), c('Ks')],
      ],
      firstCard: c('4h'),
    });

    // p2 plays Ace of hearts
    log('p2 plays A♥');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Ah') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: ace chain active, p2 turn');
    expect(r1.newState.pendingEffect).toEqual({ type: 'ace-chain', suit: 'hearts', acesPlayed: 1 });
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p2');

    // p2 plays 3h — matches ace suit (hearts)
    log('p2 plays 3♥');
    const r2 = applyAction(r1.newState, 'p2', { type: 'PLAY_CARD', card: c('3h') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    // Ace chain cleared, turn advances
    log('Verify: chain cleared, p3 turn, p1 drew card');
    expect(r2.newState.pendingEffect).toBeNull();
    expect(r2.newState.players[r2.newState.currentPlayerIndex].id).toBe('p3');
    // 3h effect: previous player draws (p1)
    const p1 = r2.newState.players.find(p => p.id === 'p1')!;
    expect(p1.hand.length).toBe(3); // 2 + 1 drawn from 3's effect
  });

  it('should allow playing any suit-matching card after ace (non-action card)', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Ah'), c('5h'), c('9c')],
        [c('6d'), c('Ks')],
      ],
      firstCard: c('4h'),
    });

    log('p2 plays A♥');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Ah') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    // Play 5h — normal card matching hearts
    log('p2 plays 5♥');
    const r2 = applyAction(r1.newState, 'p2', { type: 'PLAY_CARD', card: c('5h') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: chain cleared, p3 turn');
    expect(r2.newState.pendingEffect).toBeNull();
    expect(r2.newState.players[r2.newState.currentPlayerIndex].id).toBe('p3');
  });
});
