import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Queen — locked card unlocks on next turn', () => {
  it('should prevent playing locked card on same turn, but allow it on next turn', () => {
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

    log('Verify: pendingEffect is queen-reveal for p3');
    expect(r1.newState.pendingEffect).toEqual({ type: 'queen-reveal', targetPlayerId: 'p3' });

    log('p3 reveals 6♦');
    const r2 = applyAction(r1.newState, 'p3', { type: 'REVEAL_CARD', card: c('6d') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: 6♦ is in both revealedCards and lockedCards');
    const p3AfterReveal = r2.newState.players.find(p => p.id === 'p3')!;
    expect(p3AfterReveal.revealedCards.length).toBe(1);
    expect(p3AfterReveal.revealedCards[0]).toEqual(c('6d'));
    expect(p3AfterReveal.lockedCards.length).toBe(1);
    expect(p3AfterReveal.lockedCards[0]).toEqual(c('6d'));

    log('p3 tries to play 6♦ — should be rejected (locked this turn)');
    const r3 = applyAction(r2.newState, 'p3', { type: 'PLAY_CARD', card: c('6d') });
    expect(r3.ok).toBe(false);
    if (!r3.ok) {
      expect(r3.reason).toContain('revealed this turn');
    }

    log('p3 draws instead');
    const r4 = applyAction(r2.newState, 'p3', { type: 'DRAW_CARD' });
    expect(r4.ok).toBe(true);
    if (!r4.ok) return;

    log('p3 passes to end turn');
    const r5 = applyAction(r4.newState, 'p3', { type: 'PASS_TURN' });
    expect(r5.ok).toBe(true);
    if (!r5.ok) return;

    log('Verify: turn advances to p1');
    expect(r5.newState.players[r5.newState.currentPlayerIndex].id).toBe('p1');

    log('p1 draws and passes');
    const r6 = applyAction(r5.newState, 'p1', { type: 'DRAW_CARD' });
    expect(r6.ok).toBe(true);
    if (!r6.ok) return;
    const r7 = applyAction(r6.newState, 'p1', { type: 'PASS_TURN' });
    expect(r7.ok).toBe(true);
    if (!r7.ok) return;

    log('Verify: turn advances to p2');
    expect(r7.newState.players[r7.newState.currentPlayerIndex].id).toBe('p2');

    log('p2 draws and passes');
    const r8 = applyAction(r7.newState, 'p2', { type: 'DRAW_CARD' });
    expect(r8.ok).toBe(true);
    if (!r8.ok) return;
    const r9 = applyAction(r8.newState, 'p2', { type: 'PASS_TURN' });
    expect(r9.ok).toBe(true);
    if (!r9.ok) return;

    log('Verify: turn cycles back to p3');
    expect(r9.newState.players[r9.newState.currentPlayerIndex].id).toBe('p3');

    log('Verify: p3 lockedCards is now empty (cleared by advanceTurn)');
    const p3NextTurn = r9.newState.players.find(p => p.id === 'p3')!;
    expect(p3NextTurn.lockedCards.length).toBe(0);

    log('Verify: 6♦ is still in revealedCards');
    expect(p3NextTurn.revealedCards.length).toBe(1);
    expect(p3NextTurn.revealedCards[0]).toEqual(c('6d'));

    log('p3 plays 6♦ (now allowed, matches suit)');
    const r10 = applyAction(r9.newState, 'p3', { type: 'PLAY_CARD', card: c('6d') });
    expect(r10.ok).toBe(true);
    if (!r10.ok) return;

    log('Verify: 6♦ is removed from hand and revealedCards');
    const p3AfterPlay = r10.newState.players.find(p => p.id === 'p3')!;
    expect(p3AfterPlay.revealedCards.length).toBe(0);
    expect(p3AfterPlay.hand.some(card => card.value === 6 && card.suit === 'diamonds')).toBe(false);

    log('Verify: turn advances to p1');
    expect(r10.newState.players[r10.newState.currentPlayerIndex].id).toBe('p1');
  });
});
