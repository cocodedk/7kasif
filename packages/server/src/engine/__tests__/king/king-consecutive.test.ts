import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('King — consecutive Kings', () => {
  it('should skip+draw again when another King is played', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Kd'), c('9c')],
        [c('3h'), c('Qh')],
        [c('Kc'), c('2s')],
      ],
      firstCard: c('4d'),
      remainingDeck: [c('Jh'), c('5c'), c('8s'), c('3d')],
    });

    log('p2 plays K♦ — skips p3 (draws 1), turn to p4');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Kd') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p4');

    log('Verify: p3 drew 1 card (now 3)');
    let p3 = r1.newState.players.find(p => p.id === 'p3')!;
    expect(p3.hand.length).toBe(3);

    log('p4 plays K♣ (matches value) — skips p1 (draws 1), turn to p2');
    const r2 = applyAction(r1.newState, 'p4', { type: 'PLAY_CARD', card: c('Kc') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: p1 was skipped and drew 1 card (now 3)');
    const skipEvent = r2.events.find(e => e.type === 'PLAYER_SKIPPED');
    expect(skipEvent!.playerId).toBe('p1');
    const p1 = r2.newState.players.find(p => p.id === 'p1')!;
    expect(p1.hand.length).toBe(3);

    log('Verify: turn goes to p2');
    expect(r2.newState.players[r2.newState.currentPlayerIndex].id).toBe('p2');
  });
});
