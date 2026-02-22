import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';
import type { PendingPenalty } from '@hafte-kasif/shared';

describe('Eight — chain redirect', () => {
  it('should redirect penalty to player 2 positions ahead', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7h'), c('9c')],
        [c('8h'), c('Ks')],
      ],
      firstCard: c('4h'),
      remainingDeck: [c('Jd'), c('5c')],
    });

    log('p2 plays 7♥ to start chain (penalty=2)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 plays 8♥ with redirect');
    const r2 = applyAction(r1.newState, 'p3', {
      type: 'PLAY_CARD',
      card: c('8h'),
      chainChoice: 'redirect',
    });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: CHAIN_REACTION event targeting p2 with penalty=2');
    const chainEvent = r2.events.find(e => e.type === 'CHAIN_REACTION');
    expect(chainEvent).toBeDefined();
    expect(chainEvent!.targetPlayerId).toBe('p2');
    expect(chainEvent!.penalty).toBe(2);

    log('Verify: target (p2) drew 1 card and has seven-penalty effect');
    const p2AfterRedirect = r2.newState.players.find(p => p.id === 'p2')!;
    expect(p2AfterRedirect.hand.length).toBe(2); // had 1 (9c) + 1 drawn
    const effect2 = r2.newState.pendingEffect;
    expect(effect2?.type).toBe('seven-penalty');
    expect((effect2 as PendingPenalty).penalty).toBe(2);
    expect((effect2 as PendingPenalty).drawn).toBe(1);
    expect((effect2 as PendingPenalty).suit).toBe('hearts');
    expect(r2.newState.players[r2.newState.currentPlayerIndex].id).toBe('p2');

    log('p2 draws second card');
    const r3 = applyAction(r2.newState, 'p2', { type: 'DRAW_CARD' });
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;

    const p2AfterDraw = r3.newState.players.find(p => p.id === 'p2')!;
    expect(p2AfterDraw.hand.length).toBe(3);
    const effect3 = r3.newState.pendingEffect;
    expect(effect3?.type).toBe('seven-penalty');
    expect((effect3 as PendingPenalty).drawn).toBe(2);

    log('p2 passes after drawing all penalty cards');
    const r4 = applyAction(r3.newState, 'p2', { type: 'PASS_TURN' });
    expect(r4.ok).toBe(true);
    if (!r4.ok) return;

    log('Verify: chain cleared and turn advanced');
    expect(r4.newState.pendingEffect).toBeNull();
    expect(r4.newState.players[r4.newState.currentPlayerIndex].id).toBe('p3');
  });
});
