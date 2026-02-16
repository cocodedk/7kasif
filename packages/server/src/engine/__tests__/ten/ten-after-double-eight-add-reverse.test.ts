import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Ten — reverse after double 8-add (7→8add→8add→10)', () => {
  it('should accumulate penalty from two 8-adds then reverse with 10', () => {
    const state = createTestState({
      hands: [
        [c('10h'), c('5s')],      // p1
        [c('7h'), c('9c')],       // p2
        [c('8h'), c('Ks')],       // p3
        [c('8h'), c('Qd')],       // p4 — second 8♥
      ],
      firstCard: c('4h'),
      remainingDeck: [c('Jd'), c('5c'), c('3d'), c('2c'), c('Kd'), c('4c'), c('6s'), c('Qc')],
    });

    log('p2 plays 7♥ (penalty=2)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 plays 8♥ add (penalty=5)');
    const r2 = applyAction(r1.newState, 'p3', {
      type: 'PLAY_CARD',
      card: c('8h'),
      chainChoice: 'add',
    });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    if (r2.newState.pendingEffect?.type === 'seven-chain') {
      expect(r2.newState.pendingEffect.penalty).toBe(5);
    }

    log('p4 plays 8♥ add (penalty=8)');
    const r3 = applyAction(r2.newState, 'p4', {
      type: 'PLAY_CARD',
      card: c('8h'),
      chainChoice: 'add',
    });
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;
    if (r3.newState.pendingEffect?.type === 'seven-chain') {
      expect(r3.newState.pendingEffect.penalty).toBe(8);
    }
    expect(r3.newState.players[r3.newState.currentPlayerIndex].id).toBe('p1');

    log('p1 plays 10♥ — reverses, penalty=8');
    const r4 = applyAction(r3.newState, 'p1', { type: 'PLAY_CARD', card: c('10h') });
    expect(r4.ok).toBe(true);
    if (!r4.ok) return;

    log('Verify: direction reversed to -1');
    expect(r4.newState.direction).toBe(-1);

    log('Verify: penalty still 8');
    if (r4.newState.pendingEffect?.type === 'seven-chain') {
      expect(r4.newState.pendingEffect.penalty).toBe(8);
    }

    log('Verify: turn goes to p4 (counter-clockwise from p1)');
    expect(r4.newState.players[r4.newState.currentPlayerIndex].id).toBe('p4');

    log('p4 has no chain card left — draws penalty one at a time');
    log('First draw: transition to seven-penalty');
    const r5 = applyAction(r4.newState, 'p4', { type: 'DRAW_CARD' });
    expect(r5.ok).toBe(true);
    if (!r5.ok) return;
    expect(r5.newState.pendingEffect?.type).toBe('seven-penalty');
    if (r5.newState.pendingEffect?.type === 'seven-penalty') {
      expect(r5.newState.pendingEffect.penalty).toBe(8);
      expect(r5.newState.pendingEffect.drawn).toBe(1);
    }

    log('Draw remaining 7 cards (penalty=8 total)');
    let currentState = r5.newState;
    for (let i = 2; i <= 8; i++) {
      const draw = applyAction(currentState, 'p4', { type: 'DRAW_CARD' });
      expect(draw.ok).toBe(true);
      if (!draw.ok) return;
      currentState = draw.newState;
    }

    log('Verify: p4 has 9 cards (1 + 8)');
    const p4 = currentState.players.find(p => p.id === 'p4')!;
    expect(p4.hand.length).toBe(9);

    log('p4 passes turn after drawing penalty');
    const r6 = applyAction(currentState, 'p4', { type: 'PASS_TURN' });
    expect(r6.ok).toBe(true);
    if (!r6.ok) return;

    log('Verify: chain cleared');
    expect(r6.newState.pendingEffect).toBeNull();
  });
});
