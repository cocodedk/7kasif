import { describe, it, expect } from 'vitest';
import { applyAction } from '../game.js';
import { validateAction } from '../validators.js';
import { createTestState, c, log } from './helpers.js';

/**
 * Tests that verify which actions (Play / Draw / Pass) are allowed
 * in each game state. These map directly to button enabled/disabled
 * states in the client.
 */

function canPlay(state: Parameters<typeof validateAction>[0], playerId: string, card: ReturnType<typeof c>) {
  return validateAction(state, playerId, { type: 'PLAY_CARD', card }) === null;
}
function canDraw(state: Parameters<typeof validateAction>[0], playerId: string) {
  return validateAction(state, playerId, { type: 'DRAW_CARD' }) === null;
}
function canPass(state: Parameters<typeof validateAction>[0], playerId: string) {
  return validateAction(state, playerId, { type: 'PASS_TURN' }) === null;
}

describe('Button states — normal turn', () => {
  it('turn start: Draw enabled, Pass disabled', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('9c'), c('Ks')],
      ],
      firstCard: c('3h'),
      currentPlayerIndex: 0,
    });

    log('Turn start — has not drawn yet');
    expect(canDraw(state, 'p1')).toBe(true);
    expect(canPass(state, 'p1')).toBe(false);
  });

  it('after drawing: Draw disabled, Pass enabled', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('9c'), c('Ks')],
      ],
      firstCard: c('3h'),
      currentPlayerIndex: 0,
    });

    log('p1 draws');
    const r1 = applyAction(state, 'p1', { type: 'DRAW_CARD' });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('After drawing — Draw disabled, Pass enabled');
    expect(canDraw(r1.newState, 'p1')).toBe(false);
    expect(canPass(r1.newState, 'p1')).toBe(true);
  });

  it('after playing a card: all buttons for current player reset on next turn', () => {
    const state = createTestState({
      hands: [
        [c('3s'), c('5s')],
        [c('9c'), c('Ks')],
      ],
      firstCard: c('3h'),
      currentPlayerIndex: 0,
    });

    log('p1 plays 3♠ (matches value of 3♥)');
    const r1 = applyAction(state, 'p1', { type: 'PLAY_CARD', card: c('3s') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p2 turn start — Draw enabled, Pass disabled');
    expect(canDraw(r1.newState, 'p2')).toBe(true);
    expect(canPass(r1.newState, 'p2')).toBe(false);
  });
});

describe('Button states — seven-chain', () => {
  it('during seven-chain: Draw enabled (accept chain), Pass disabled, only 7/8/10 playable', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('7d'), c('Ks')],
        [c('9c'), c('Ks')],
      ],
      firstCard: c('3h'),
      currentPlayerIndex: 0,
      pendingEffect: { type: 'seven-chain', penalty: 2, suit: 'hearts' },
    });

    log('Seven-chain pending — only counter cards playable');
    expect(canPlay(state, 'p1', c('4s'))).toBe(false);   // not a chain card
    expect(canPlay(state, 'p1', c('7d'))).toBe(true);     // 7 always counters
    expect(canDraw(state, 'p1')).toBe(true);               // accept chain
    expect(canPass(state, 'p1')).toBe(false);              // must counter or draw
  });
});

describe('Button states — seven-penalty (drawing phase)', () => {
  it('penalty not fulfilled: Play disabled, Draw enabled, Pass disabled', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('9c'), c('Ks')],
      ],
      firstCard: c('3h'),
      currentPlayerIndex: 0,
      pendingEffect: { type: 'seven-penalty', penalty: 2, drawn: 0, suit: 'hearts' },
    });

    log('Must keep drawing — penalty not fulfilled');
    expect(canPlay(state, 'p1', c('4s'))).toBe(false);
    expect(canDraw(state, 'p1')).toBe(true);
    expect(canPass(state, 'p1')).toBe(false);
  });

  it('penalty partially fulfilled: still must draw', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('9c'), c('Ks')],
      ],
      firstCard: c('3h'),
      currentPlayerIndex: 0,
      pendingEffect: { type: 'seven-penalty', penalty: 2, drawn: 1, suit: 'hearts' },
    });

    log('Drew 1/2 — still must draw');
    expect(canPlay(state, 'p1', c('4s'))).toBe(false);
    expect(canDraw(state, 'p1')).toBe(true);
    expect(canPass(state, 'p1')).toBe(false);
  });
});

describe('Button states — seven-penalty (fulfilled)', () => {
  it('penalty fulfilled: Play enabled, Draw enabled (optional extra), Pass enabled', () => {
    const state = createTestState({
      hands: [
        [c('3s'), c('5s')],
        [c('9c'), c('Ks')],
      ],
      firstCard: c('3h'),
      currentPlayerIndex: 0,
      pendingEffect: { type: 'seven-penalty', penalty: 2, drawn: 2, suit: 'hearts' },
    });

    log('Penalty fulfilled — all actions available');
    expect(canPlay(state, 'p1', c('3s'))).toBe(true);  // matches value
    expect(canDraw(state, 'p1')).toBe(true);            // optional extra
    expect(canPass(state, 'p1')).toBe(true);
  });

  it('optional extra draw taken: Draw disabled', () => {
    const state = createTestState({
      hands: [
        [c('3s'), c('5s')],
        [c('9c'), c('Ks')],
      ],
      firstCard: c('3h'),
      currentPlayerIndex: 0,
      pendingEffect: { type: 'seven-penalty', penalty: 2, drawn: 3, suit: 'hearts' },
    });

    log('Extra draw already taken — Draw disabled');
    expect(canDraw(state, 'p1')).toBe(false);
    expect(canPass(state, 'p1')).toBe(true);
  });
});

describe('Button states — ace-chain', () => {
  it('during ace-chain: only ace/matching suit playable, Draw enabled, Pass disabled', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('Ah'), c('5h')],
        [c('9c'), c('Ks')],
      ],
      firstCard: c('3h'),
      currentPlayerIndex: 0,
      pendingEffect: { type: 'ace-chain', suit: 'hearts', acesPlayed: 1 },
    });

    log('Ace chain — restricted play, can draw to break');
    expect(canPlay(state, 'p1', c('4s'))).toBe(false);  // wrong suit, not ace
    expect(canPlay(state, 'p1', c('Ah'))).toBe(true);   // ace
    expect(canPlay(state, 'p1', c('5h'))).toBe(true);   // matching suit
    expect(canDraw(state, 'p1')).toBe(true);             // break chain
    expect(canPass(state, 'p1')).toBe(false);            // must play or draw
  });
});

describe('Button states — queen-reveal', () => {
  it('during queen-reveal: Play/Draw/Pass all blocked, must reveal', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('9c'), c('Ks')],
      ],
      firstCard: c('3h'),
      currentPlayerIndex: 1,
      pendingEffect: { type: 'queen-reveal', targetPlayerId: 'p2' },
    });

    log('Queen reveal pending — all normal actions blocked');
    expect(canPlay(state, 'p2', c('9c'))).toBe(false);
    expect(canDraw(state, 'p2')).toBe(false);
    expect(canPass(state, 'p2')).toBe(false);

    log('Reveal action allowed');
    const revealErr = validateAction(state, 'p2', { type: 'REVEAL_CARD', card: c('9c') });
    expect(revealErr).toBeNull();
  });
});

describe('Button states — not your turn', () => {
  it('all actions blocked when not your turn', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('9c'), c('Ks')],
      ],
      firstCard: c('3h'),
      currentPlayerIndex: 0,
    });

    log('p2 tries to act on p1 turn — all blocked');
    expect(canPlay(state, 'p2', c('9c'))).toBe(false);
    expect(canDraw(state, 'p2')).toBe(false);
    expect(canPass(state, 'p2')).toBe(false);
  });
});
