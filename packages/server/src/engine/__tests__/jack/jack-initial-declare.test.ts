import { describe, it, expect } from 'vitest';
import { applyAction, createInitialState } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';
import type { Card } from '@hafte-kasif/shared';

describe('Jack — initial card declaration', () => {
  it('should set jack-declare pending effect when first card is a Jack', () => {
    log('Rig deck so first flipped card is a Jack');
    // Build a deck where the card at position after dealing is a Jack
    // 3 players × 2 cards = 6 dealt, then 7th card is the first discard
    const riggedDeck: Card[] = [];
    // Fill 6 dealing cards (players get these)
    riggedDeck.push(c('2h'), c('3h'), c('4h')); // round 1: p1, p2, p3
    riggedDeck.push(c('5h'), c('6h'), c('7h')); // round 2: p1, p2, p3
    // 7th card = first discard = Jack
    riggedDeck.push(c('Jd'));
    // Remaining deck
    riggedDeck.push(c('8h'), c('9h'), c('10h'), c('Qs'));

    // Reverse so pop() gives cards in order
    riggedDeck.reverse();

    const state = createInitialState(
      [
        { id: 'p1', name: 'Player 1' },
        { id: 'p2', name: 'Player 2' },
        { id: 'p3', name: 'Player 3' },
      ],
      'p1', // dealer
      2,
      'standard',
      () => riggedDeck, // no-shuffle
    );

    log('Verify: pendingEffect is jack-declare');
    expect(state.pendingEffect).toEqual({ type: 'jack-declare' });

    log('Verify: current player is the dealer (p1)');
    expect(state.players[state.currentPlayerIndex].id).toBe('p1');

    log('Verify: top discard is J♦');
    const topDiscard = state.discardPile[state.discardPile.length - 1];
    expect(topDiscard.value).toBe('jack');
    expect(topDiscard.suit).toBe('diamonds');
  });

  it('should reject PLAY_CARD during jack-declare', () => {
    const state = createTestState({
      hands: [
        [c('4h'), c('5d')],
        [c('3h'), c('9s')],
        [c('Ks'), c('Qh')],
      ],
      firstCard: c('Jd'),
      dealerIndex: 0,
      currentPlayerIndex: 0, // dealer is current
      pendingEffect: { type: 'jack-declare' },
    });

    log('p1 (dealer) tries to play 4♥ — should be rejected');
    const r1 = applyAction(state, 'p1', {
      type: 'PLAY_CARD',
      card: c('4h'),
    });
    expect(r1.ok).toBe(false);
    if (!r1.ok) {
      log(`Rejected: ${r1.reason}`);
      expect(r1.reason).toContain('declare a suit');
    }
  });

  it('should reject DRAW_CARD during jack-declare', () => {
    const state = createTestState({
      hands: [
        [c('4h'), c('5d')],
        [c('3h'), c('9s')],
        [c('Ks'), c('Qh')],
      ],
      firstCard: c('Jd'),
      dealerIndex: 0,
      currentPlayerIndex: 0,
      pendingEffect: { type: 'jack-declare' },
    });

    log('p1 (dealer) tries to draw — should be rejected');
    const r1 = applyAction(state, 'p1', { type: 'DRAW_CARD' });
    expect(r1.ok).toBe(false);
    if (!r1.ok) {
      log(`Rejected: ${r1.reason}`);
      expect(r1.reason).toContain('declare a suit');
    }
  });

  it('should reject PASS_TURN during jack-declare', () => {
    const state = createTestState({
      hands: [
        [c('4h'), c('5d')],
        [c('3h'), c('9s')],
        [c('Ks'), c('Qh')],
      ],
      firstCard: c('Jd'),
      dealerIndex: 0,
      currentPlayerIndex: 0,
      pendingEffect: { type: 'jack-declare' },
    });

    log('p1 (dealer) tries to pass — should be rejected');
    const r1 = applyAction(state, 'p1', { type: 'PASS_TURN' });
    expect(r1.ok).toBe(false);
    if (!r1.ok) {
      log(`Rejected: ${r1.reason}`);
      expect(r1.reason).toContain('declare a suit');
    }
  });

  it('should accept DECLARE_SUIT and advance turn to next player', () => {
    const state = createTestState({
      hands: [
        [c('4h'), c('5d')],
        [c('3h'), c('9s')],
        [c('Ks'), c('Qh')],
      ],
      firstCard: c('Jd'),
      dealerIndex: 0,
      currentPlayerIndex: 0,
      pendingEffect: { type: 'jack-declare' },
    });

    log('p1 (dealer) declares hearts');
    const r1 = applyAction(state, 'p1', {
      type: 'DECLARE_SUIT',
      suit: 'hearts',
    });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: HOUSE_CHANGED event to hearts');
    const houseEvent = r1.events.find(e => e.type === 'HOUSE_CHANGED');
    expect(houseEvent).toBeDefined();
    expect(houseEvent!.newSuit).toBe('hearts');

    log('Verify: pendingEffect cleared');
    expect(r1.newState.pendingEffect).toBeNull();

    log('Verify: turn advances to p2 (next after dealer)');
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p2');
  });

  it('should reject DECLARE_SUIT from non-current player', () => {
    const state = createTestState({
      hands: [
        [c('4h'), c('5d')],
        [c('3h'), c('9s')],
        [c('Ks'), c('Qh')],
      ],
      firstCard: c('Jd'),
      dealerIndex: 0,
      currentPlayerIndex: 0,
      pendingEffect: { type: 'jack-declare' },
    });

    log('p2 (not dealer) tries to declare suit — should be rejected');
    const r1 = applyAction(state, 'p2', {
      type: 'DECLARE_SUIT',
      suit: 'clubs',
    });
    expect(r1.ok).toBe(false);
    if (!r1.ok) {
      log(`Rejected: ${r1.reason}`);
      expect(r1.reason).toContain('Not your turn');
    }
  });

  it('should reject DECLARE_SUIT when no jack-declare is pending', () => {
    const state = createTestState({
      hands: [
        [c('4h'), c('5d')],
        [c('3h'), c('9s')],
        [c('Ks'), c('Qh')],
      ],
      firstCard: c('4d'),
    });

    log('p2 tries DECLARE_SUIT on a normal turn — should be rejected');
    const r1 = applyAction(state, 'p2', {
      type: 'DECLARE_SUIT',
      suit: 'spades',
    });
    expect(r1.ok).toBe(false);
    if (!r1.ok) {
      log(`Rejected: ${r1.reason}`);
      expect(r1.reason).toContain('No suit declaration pending');
    }
  });

  it('should enforce declared suit for the next player after declaration', () => {
    const state = createTestState({
      hands: [
        [c('4h'), c('5d')],
        [c('3s'), c('9s')],
        [c('Ks'), c('Qh')],
      ],
      firstCard: c('Jd'),
      dealerIndex: 0,
      currentPlayerIndex: 0,
      pendingEffect: { type: 'jack-declare' },
    });

    log('p1 declares clubs as house');
    const r1 = applyAction(state, 'p1', {
      type: 'DECLARE_SUIT',
      suit: 'clubs',
    });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p2 tries 3♠ — should be rejected (house is clubs, value J doesn\'t match 3)');
    const r2 = applyAction(r1.newState, 'p2', {
      type: 'PLAY_CARD',
      card: c('3s'),
    });
    expect(r2.ok).toBe(false);
    if (!r2.ok) {
      log(`Rejected: ${r2.reason}`);
    }

    log('p2 draws instead');
    const r3 = applyAction(r1.newState, 'p2', { type: 'DRAW_CARD' });
    expect(r3.ok).toBe(true);
  });
});
