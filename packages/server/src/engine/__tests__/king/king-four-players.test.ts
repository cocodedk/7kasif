import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('King — four players skip+draw verification', () => {
  it('should only affect the next player, not others', () => {
    const state = createTestState({
      hands: [
        [c('Kh'), c('5s')],
        [c('3d'), c('9c')],
        [c('6c'), c('Qh')],
        [c('4c'), c('2s')],
      ],
      firstCard: c('4h'),
      currentPlayerIndex: 0,
      remainingDeck: [c('Jh'), c('5c')],
    });

    log('p1 plays K♥ in 4-player game');
    const r1 = applyAction(state, 'p1', { type: 'PLAY_CARD', card: c('Kh') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: p2 was skipped and drew 1 card (now 3)');
    const p2 = r1.newState.players.find(p => p.id === 'p2')!;
    expect(p2.hand.length).toBe(3);

    log('Verify: p3 hand unchanged (not affected)');
    const p3 = r1.newState.players.find(p => p.id === 'p3')!;
    expect(p3.hand.length).toBe(2);

    log('Verify: p4 hand unchanged (not affected)');
    const p4 = r1.newState.players.find(p => p.id === 'p4')!;
    expect(p4.hand.length).toBe(2);

    log('Verify: turn goes to p3');
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p3');

    log('Verify: only one PLAYER_SKIPPED event');
    const skipEvents = r1.events.filter(e => e.type === 'PLAYER_SKIPPED');
    expect(skipEvents.length).toBe(1);
  });
});
