import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Queen — revealed card removed when played on a later turn', () => {
  it('should allow playing revealed card after lockedCards is cleared on next turn', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],       // p1
        [c('Qd'), c('9c')],       // p2
        [c('6d'), c('Ks')],       // p3
      ],
      firstCard: c('4d'),
    });

    log('p2 plays Q♦ — sets pendingEffect for p3');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Qd') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 reveals 6♦');
    const r2 = applyAction(r1.newState, 'p3', { type: 'REVEAL_CARD', card: c('6d') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    const p3 = r2.newState.players.find(p => p.id === 'p3')!;
    expect(p3.revealedCards.length).toBe(1);
    expect(p3.lockedCards.length).toBe(1);

    log('p3 tries to play 6♦ — should be rejected (locked this turn)');
    const r3 = applyAction(r2.newState, 'p3', { type: 'PLAY_CARD', card: c('6d') });
    expect(r3.ok).toBe(false);

    log('p3 draws and passes instead');
    const r4 = applyAction(r2.newState, 'p3', { type: 'DRAW_CARD' });
    expect(r4.ok).toBe(true);
    if (!r4.ok) return;
    const r5 = applyAction(r4.newState, 'p3', { type: 'PASS_TURN' });
    expect(r5.ok).toBe(true);
    if (!r5.ok) return;

    log('Back to p1, then p2 — cycling back to p3');
    const r6 = applyAction(r5.newState, 'p1', { type: 'DRAW_CARD' });
    expect(r6.ok).toBe(true);
    if (!r6.ok) return;
    const r7 = applyAction(r6.newState, 'p1', { type: 'PASS_TURN' });
    expect(r7.ok).toBe(true);
    if (!r7.ok) return;

    const r8 = applyAction(r7.newState, 'p2', { type: 'DRAW_CARD' });
    expect(r8.ok).toBe(true);
    if (!r8.ok) return;
    const r9 = applyAction(r8.newState, 'p2', { type: 'PASS_TURN' });
    expect(r9.ok).toBe(true);
    if (!r9.ok) return;

    log('p3 turn again — lockedCards should be cleared, 6♦ now playable');
    const p3Later = r9.newState.players.find(p => p.id === 'p3')!;
    expect(p3Later.revealedCards.length).toBe(1);
    expect(p3Later.lockedCards.length).toBe(0);

    log('p3 plays 6♦ (now allowed)');
    const r10 = applyAction(r9.newState, 'p3', { type: 'PLAY_CARD', card: c('6d') });
    expect(r10.ok).toBe(true);
  });
});
