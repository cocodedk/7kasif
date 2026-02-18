import { describe, it, expect } from 'vitest';
import { createInitialState, applyAction } from '../game.js';
import { c, log } from './helpers.js';
import type { Card } from '@hafte-kasif/shared';

const players = [
  { id: 'p1', name: 'Player 1' },
  { id: 'p2', name: 'Player 2' },
  { id: 'p3', name: 'Player 3' },
  { id: 'p4', name: 'Player 4' },
];

/**
 * Build a rigged deck for 4 players × 2 cards = 8 dealt, then targetCard as 9th (first discard).
 * Remaining filler cards follow after.
 */
function rigDeck(targetCard: Card, filler: Card[] = []): Card[] {
  const dealing: Card[] = [
    c('2h'), c('3h'), c('4h'), c('5h'), // round 1
    c('6h'), c('7h'), c('8h'), c('9h'), // round 2
  ];
  const remaining = filler.length > 0
    ? filler
    : [c('10h'), c('2d'), c('3d'), c('4d'), c('5d'), c('6d'), c('7d'), c('8d'), c('9d'), c('10d')];
  const deck = [...dealing, targetCard, ...remaining];
  deck.reverse(); // pop() reads from end
  return deck;
}

function makeState(targetCard: Card, filler?: Card[]) {
  const deck = rigDeck(targetCard, filler);
  return createInitialState(players, 'p1', 2, 'standard', () => deck);
}

describe('Initial card effects — createInitialState', () => {
  // ─── Default (no effect) ───

  it('4 as first card — no effect, first player is next after dealer', () => {
    const state = makeState(c('4s'));

    log('Verify: no pending effect');
    expect(state.pendingEffect).toBeNull();

    log('Verify: current player is p2 (next after dealer p1)');
    expect(state.players[state.currentPlayerIndex].id).toBe('p2');

    log('Verify: direction is clockwise');
    expect(state.direction).toBe(1);
  });

  it('5 as first card — no effect', () => {
    const state = makeState(c('5s'));

    expect(state.pendingEffect).toBeNull();
    expect(state.players[state.currentPlayerIndex].id).toBe('p2');
  });

  it('9 of non-diamond as first card — no effect', () => {
    const state = makeState(c('9s'));

    log('Verify: 9♠ has no special effect');
    expect(state.pendingEffect).toBeNull();
    expect(state.players[state.currentPlayerIndex].id).toBe('p2');

    // All players still have 2 cards
    for (const p of state.players) {
      expect(p.hand.length).toBe(2);
    }
  });

  // ─── 3: Previous player draws 1 ───

  it('3 as first card — previous player (before dealer) draws 1', () => {
    const state = makeState(c('3s'));

    log('Verify: p4 (previous to dealer p1) has 3 cards');
    const p4 = state.players.find(p => p.id === 'p4')!;
    expect(p4.hand.length).toBe(3);

    log('Verify: other players still have 2 cards');
    expect(state.players.find(p => p.id === 'p1')!.hand.length).toBe(2);
    expect(state.players.find(p => p.id === 'p2')!.hand.length).toBe(2);
    expect(state.players.find(p => p.id === 'p3')!.hand.length).toBe(2);

    log('Verify: current player is p2 (normal turn order)');
    expect(state.players[state.currentPlayerIndex].id).toBe('p2');
  });

  // ─── 6: Next two players draw 1 each ───

  it('6 as first card — next two players draw 1 each', () => {
    const state = makeState(c('6s'));

    log('Verify: p2 (next1) has 3 cards');
    expect(state.players.find(p => p.id === 'p2')!.hand.length).toBe(3);

    log('Verify: p3 (next2) has 3 cards');
    expect(state.players.find(p => p.id === 'p3')!.hand.length).toBe(3);

    log('Verify: p1 and p4 still have 2 cards');
    expect(state.players.find(p => p.id === 'p1')!.hand.length).toBe(2);
    expect(state.players.find(p => p.id === 'p4')!.hand.length).toBe(2);

    log('Verify: current player is p2');
    expect(state.players[state.currentPlayerIndex].id).toBe('p2');
  });

  // ─── 7: Seven-chain pending effect ───

  it('7 as first card — seven-chain with penalty 2', () => {
    const state = makeState(c('7s'));

    log('Verify: pendingEffect is seven-chain with penalty 2');
    expect(state.pendingEffect).toEqual({
      type: 'seven-chain',
      penalty: 2,
      suit: 'spades',
    });

    log('Verify: current player is p2 (faces the chain)');
    expect(state.players[state.currentPlayerIndex].id).toBe('p2');
  });

  // ─── 8: Skip next player ───

  it('8 as first card — skip next player', () => {
    const state = makeState(c('8s'));

    log('Verify: p2 is skipped, current player is p3');
    expect(state.players[state.currentPlayerIndex].id).toBe('p3');

    log('Verify: no pending effect');
    expect(state.pendingEffect).toBeNull();
  });

  // ─── 9♦: All others draw 1 ───

  it('9 of diamonds as first card — all non-dealer players draw 1', () => {
    const state = makeState(c('9d'));

    log('Verify: dealer p1 still has 2 cards');
    expect(state.players.find(p => p.id === 'p1')!.hand.length).toBe(2);

    log('Verify: p2, p3, p4 each have 3 cards');
    expect(state.players.find(p => p.id === 'p2')!.hand.length).toBe(3);
    expect(state.players.find(p => p.id === 'p3')!.hand.length).toBe(3);
    expect(state.players.find(p => p.id === 'p4')!.hand.length).toBe(3);

    log('Verify: current player is p2');
    expect(state.players[state.currentPlayerIndex].id).toBe('p2');
  });

  // ─── 10: Reverse direction ───

  it('10 as first card — reverse direction', () => {
    const state = makeState(c('10s'));

    log('Verify: direction is counter-clockwise');
    expect(state.direction).toBe(-1);

    log('Verify: first player is counter-clockwise from dealer (p4)');
    expect(state.players[state.currentPlayerIndex].id).toBe('p4');
  });

  // ─── King: Skip next + draw 1 ───

  it('King as first card — skip next player and they draw 1', () => {
    const state = makeState(c('Ks'));

    log('Verify: p2 (skipped) has 3 cards (drew 1)');
    expect(state.players.find(p => p.id === 'p2')!.hand.length).toBe(3);

    log('Verify: current player is p3 (skipped p2)');
    expect(state.players[state.currentPlayerIndex].id).toBe('p3');
  });

  // ─── Queen: Queen-reveal for first player ───

  it('Queen as first card — queen-reveal pending for first player', () => {
    const state = makeState(c('Qs'));

    log('Verify: pendingEffect is queen-reveal targeting p2');
    expect(state.pendingEffect).toEqual({
      type: 'queen-reveal',
      targetPlayerId: 'p2',
    });

    log('Verify: current player is p2');
    expect(state.players[state.currentPlayerIndex].id).toBe('p2');
  });

  // ─── Ace: Dealer ace-chain ───

  it('Ace as first card — ace-chain pending, dealer is current', () => {
    const state = makeState(c('As'));

    log('Verify: pendingEffect is ace-chain');
    expect(state.pendingEffect).toEqual({
      type: 'ace-chain',
      suit: 'spades',
      acesPlayed: 1,
    });

    log('Verify: current player is dealer (p1)');
    expect(state.players[state.currentPlayerIndex].id).toBe('p1');
  });

  // ─── 2: Dealer becomes current (must give card) ───

  it('2 as first card — dealer is current player', () => {
    const state = makeState(c('2s'));

    log('Verify: current player is dealer (p1)');
    expect(state.players[state.currentPlayerIndex].id).toBe('p1');

    log('Verify: no pending effect (2-give is handled as normal action)');
    expect(state.pendingEffect).toBeNull();
  });

  // ─── Jack: Covered in jack/jack-initial-declare.test.ts ───
  // Included here for completeness of the matrix.

  it('Jack as first card — jack-declare pending, dealer is current', () => {
    const state = makeState(c('Js'));

    log('Verify: pendingEffect is jack-declare');
    expect(state.pendingEffect).toEqual({ type: 'jack-declare' });

    log('Verify: current player is dealer (p1)');
    expect(state.players[state.currentPlayerIndex].id).toBe('p1');
  });
});
