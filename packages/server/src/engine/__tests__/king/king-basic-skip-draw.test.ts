import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('King — basic skip + draw', () => {
  it('should skip next player and make them draw 1 card', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Kd'), c('9c')],
        [c('3h'), c('Qh')],
        [c('6c'), c('2s')],
      ],
      firstCard: c('4d'),
      remainingDeck: [c('Jh'), c('5c')],
    });

    log('p2 plays K♦ (matches suit of 4♦)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Kd') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: p3 was skipped');
    const skipEvent = r1.events.find(e => e.type === 'PLAYER_SKIPPED');
    expect(skipEvent).toBeDefined();
    expect(skipEvent!.playerId).toBe('p3');

    log('Verify: p3 drew 1 card (now 3)');
    const p3 = r1.newState.players.find(p => p.id === 'p3')!;
    expect(p3.hand.length).toBe(3);

    log('Verify: turn goes to p4 (skipped p3)');
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p4');
  });
});
