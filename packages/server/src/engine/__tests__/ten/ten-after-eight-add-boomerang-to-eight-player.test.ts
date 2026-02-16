import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Ten — 8-add boomerang back to 8-player (3 players)', () => {
  it('should bounce penalty back so 8-player eats their own added penalty', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],       // p1
        [c('7h'), c('9c')],       // p2
        [c('8h'), c('10h')],      // p3 — will add then get boomeranged
      ],
      firstCard: c('4h'),
      remainingDeck: [c('Jd'), c('5c'), c('3d'), c('2c'), c('Kd')],
    });

    log('p2 plays 7♥ (penalty=2, turn → p3)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 plays 8♥ add (penalty=5, turn → p1)');
    const r2 = applyAction(r1.newState, 'p3', {
      type: 'PLAY_CARD',
      card: c('8h'),
      chainChoice: 'add',
    });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r2.newState.players[r2.newState.currentPlayerIndex].id).toBe('p1');

    log('p1 has no chain card — draws penalty one at a time');
    log('First draw: transition to seven-penalty');
    const r3 = applyAction(r2.newState, 'p1', { type: 'DRAW_CARD' });
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;
    expect(r3.newState.pendingEffect?.type).toBe('seven-penalty');
    if (r3.newState.pendingEffect?.type === 'seven-penalty') {
      expect(r3.newState.pendingEffect.penalty).toBe(5);
      expect(r3.newState.pendingEffect.drawn).toBe(1);
    }

    log('Draw remaining 4 cards (penalty=5 total)');
    let currentState = r3.newState;
    for (let i = 2; i <= 5; i++) {
      const draw = applyAction(currentState, 'p1', { type: 'DRAW_CARD' });
      expect(draw.ok).toBe(true);
      if (!draw.ok) return;
      currentState = draw.newState;
    }

    log('Verify: p1 has 7 cards (2 + 5)');
    const p1 = currentState.players.find(p => p.id === 'p1')!;
    expect(p1.hand.length).toBe(7);

    log('p1 passes turn after drawing penalty');
    const r4 = applyAction(currentState, 'p1', { type: 'PASS_TURN' });
    expect(r4.ok).toBe(true);
    if (!r4.ok) return;

    log('Verify: chain cleared after p1 drew');
    expect(r4.newState.pendingEffect).toBeNull();
  });

  it('what if p1 plays 10 instead — bounces penalty back through p3 to p2', () => {
    const state = createTestState({
      hands: [
        [c('10h'), c('5s')],      // p1 — has 10♥
        [c('7h'), c('9c')],       // p2
        [c('8h'), c('Ks')],       // p3
      ],
      firstCard: c('4h'),
      remainingDeck: [c('Jd'), c('5c'), c('3d'), c('2c'), c('Kd')],
    });

    log('p2 plays 7♥ (penalty=2, turn → p3)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 plays 8♥ add (penalty=5, turn → p1)');
    const r2 = applyAction(r1.newState, 'p3', {
      type: 'PLAY_CARD',
      card: c('8h'),
      chainChoice: 'add',
    });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('p1 plays 10♥ — reverses direction (penalty=5, turn → p2)');
    const r3 = applyAction(r2.newState, 'p1', { type: 'PLAY_CARD', card: c('10h') });
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;

    log('Verify: direction reversed');
    expect(r3.newState.direction).toBe(-1);

    log('Verify: penalty still 5');
    if (r3.newState.pendingEffect?.type === 'seven-chain') {
      expect(r3.newState.pendingEffect.penalty).toBe(5);
    }

    log('Verify: turn goes to p2 (counter-clockwise from p1 wraps)');
    // In reverse from p1 (idx 0): (0 + (-1) + 3) % 3 = 2 → p3
    // Wait — counter-clockwise from p1 goes to p3, not p2
    const currentPlayer = r3.newState.players[r3.newState.currentPlayerIndex].id;
    expect(currentPlayer).toBe('p3');

    log(`Turn is at ${currentPlayer} — they started the 8-add!`);

    log('p3 has no chain card — draws 5 (their own added penalty!) one at a time');
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
    let state2 = r4.newState;
    for (let i = 2; i <= 5; i++) {
      const draw = applyAction(state2, 'p3', { type: 'DRAW_CARD' });
      expect(draw.ok).toBe(true);
      if (!draw.ok) return;
      state2 = draw.newState;
    }

    log('Verify: p3 has 6 cards (1 + 5)');
    const p3 = state2.players.find(p => p.id === 'p3')!;
    expect(p3.hand.length).toBe(6);

    log('p3 passes turn after drawing penalty');
    const r5 = applyAction(state2, 'p3', { type: 'PASS_TURN' });
    expect(r5.ok).toBe(true);
    if (!r5.ok) return;

    log('Verify: chain cleared — p3 ate their own medicine');
    expect(r5.newState.pendingEffect).toBeNull();
  });
});
