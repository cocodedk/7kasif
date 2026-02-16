import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Ten — reverse after 8-add in chain', () => {
  it('should reverse direction with accumulated penalty (7→8add→10)', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],       // p1
        [c('7h'), c('9c')],       // p2
        [c('8h'), c('Ks')],       // p3
        [c('10h'), c('Qd')],      // p4
      ],
      firstCard: c('4h'),
      remainingDeck: [c('Jd'), c('5c'), c('3d'), c('2c'), c('Kd')],
    });

    log('p2 plays 7♥ (penalty=2, turn → p3)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p3');

    log('p3 plays 8♥ add (penalty=5, turn → p4)');
    const r2 = applyAction(r1.newState, 'p3', {
      type: 'PLAY_CARD',
      card: c('8h'),
      chainChoice: 'add',
    });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r2.newState.pendingEffect!.type).toBe('seven-chain');
    if (r2.newState.pendingEffect!.type === 'seven-chain') {
      expect(r2.newState.pendingEffect!.penalty).toBe(5);
    }
    expect(r2.newState.players[r2.newState.currentPlayerIndex].id).toBe('p4');

    log('p4 plays 10♥ — reverses direction, penalty stays at 5');
    const r3 = applyAction(r2.newState, 'p4', { type: 'PLAY_CARD', card: c('10h') });
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;

    log('Verify: direction reversed to -1');
    expect(r3.newState.direction).toBe(-1);

    log('Verify: penalty still 5');
    expect(r3.newState.pendingEffect!.type).toBe('seven-chain');
    if (r3.newState.pendingEffect!.type === 'seven-chain') {
      expect(r3.newState.pendingEffect!.penalty).toBe(5);
    }

    log('Verify: turn goes to p3 (counter-clockwise from p4)');
    expect(r3.newState.players[r3.newState.currentPlayerIndex].id).toBe('p3');

    log('p3 has no chain card — draws penalty one at a time');
    log('First draw: transition to seven-penalty');
    const r4 = applyAction(r3.newState, 'p3', { type: 'DRAW_CARD' });
    expect(r4.ok).toBe(true);
    if (!r4.ok) return;
    expect(r4.newState.pendingEffect?.type).toBe('seven-penalty');
    if (r4.newState.pendingEffect?.type === 'seven-penalty') {
      expect(r4.newState.pendingEffect.penalty).toBe(5);
      expect(r4.newState.pendingEffect.drawn).toBe(1);
    }

    log('Draw remaining 4 cards (penalty=5 total)');
    let currentState = r4.newState;
    for (let i = 2; i <= 5; i++) {
      const draw = applyAction(currentState, 'p3', { type: 'DRAW_CARD' });
      expect(draw.ok).toBe(true);
      if (!draw.ok) return;
      currentState = draw.newState;
    }

    log('Verify: p3 has 6 cards (1 + 5)');
    const p3 = currentState.players.find(p => p.id === 'p3')!;
    expect(p3.hand.length).toBe(6);

    log('p3 passes turn after drawing penalty');
    const r5 = applyAction(currentState, 'p3', { type: 'PASS_TURN' });
    expect(r5.ok).toBe(true);
    if (!r5.ok) return;

    log('Verify: chain cleared');
    expect(r5.newState.pendingEffect).toBeNull();
  });
});
