import { describe, it, expect } from 'vitest';
import { applyAction } from '../game.js';
import { createTestState, c } from './helpers.js';
import type { GameState, PlayCardAction } from '@hafte-kasif/shared';
import { cardEquals, handValue } from '@hafte-kasif/shared';

// ─── Basic Turn Flow ───

describe('Basic Turn Flow', () => {
  it('should allow playing a card that matches by suit', () => {
    const state = createTestState({
      hands: [
        [c('4h'), c('5s')],
        [c('6h'), c('3d')],
        [c('9c'), c('2s')],
      ],
      firstCard: c('4d'), // normal card, no effect
    });

    // p2 is the current player (right of dealer p1)
    expect(state.players[state.currentPlayerIndex].id).toBe('p2');

    const result = applyAction(state, 'p2', {
      type: 'PLAY_CARD',
      card: c('3d'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.newState.discardPile[result.newState.discardPile.length - 1]).toEqual(c('3d'));
    }
  });

  it('should allow playing a card that matches by value', () => {
    const state = createTestState({
      hands: [
        [c('4h'), c('5s')],
        [c('4c'), c('3d')],
        [c('9c'), c('2s')],
      ],
      firstCard: c('4d'),
    });

    const result = applyAction(state, 'p2', {
      type: 'PLAY_CARD',
      card: c('4c'),
    });

    expect(result.ok).toBe(true);
  });

  it('should reject a card that does not match suit or value', () => {
    const state = createTestState({
      hands: [
        [c('4h'), c('5s')],
        [c('9c'), c('3s')],
        [c('9h'), c('2s')],
      ],
      firstCard: c('4d'),
    });

    const result = applyAction(state, 'p2', {
      type: 'PLAY_CARD',
      card: c('3s'),
    });

    expect(result.ok).toBe(false);
  });

  it('should reject play when not your turn', () => {
    const state = createTestState({
      hands: [
        [c('4h'), c('5s')],
        [c('6h'), c('3d')],
        [c('9c'), c('2s')],
      ],
      firstCard: c('4d'),
    });

    const result = applyAction(state, 'p3', {
      type: 'PLAY_CARD',
      card: c('9c'),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('Not your turn');
    }
  });

  it('should allow drawing a card', () => {
    const state = createTestState({
      hands: [
        [c('4h'), c('5s')],
        [c('9c'), c('3s')],
        [c('9h'), c('2s')],
      ],
      firstCard: c('4d'),
      remainingDeck: [c('Kh'), c('Qd')],
    });

    const result = applyAction(state, 'p2', { type: 'DRAW_CARD' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      // Player drew 1 card, now has 3
      const p2 = result.newState.players.find(p => p.id === 'p2')!;
      expect(p2.hand.length).toBe(3);
      // Turn is still p2's — they can play or pass
      expect(result.newState.players[result.newState.currentPlayerIndex].id).toBe('p2');
    }
  });

  it('should allow passing after drawing', () => {
    const state = createTestState({
      hands: [
        [c('4h'), c('5s')],
        [c('9c'), c('3s')],
        [c('9h'), c('2s')],
      ],
      firstCard: c('4d'),
      remainingDeck: [c('Kh')],
    });

    // Draw first
    const drawResult = applyAction(state, 'p2', { type: 'DRAW_CARD' });
    expect(drawResult.ok).toBe(true);

    // Then pass
    if (drawResult.ok) {
      const passResult = applyAction(drawResult.newState, 'p2', { type: 'PASS_TURN' });
      expect(passResult.ok).toBe(true);
      if (passResult.ok) {
        expect(passResult.newState.players[passResult.newState.currentPlayerIndex].id).toBe('p3');
      }
    }
  });
});

// ─── Ace Mechanics ───

describe('Ace Mechanics', () => {
  it('should require another card after playing an Ace', () => {
    const state = createTestState({
      hands: [
        [c('Ah'), c('5s')],
        [c('Ah'), c('5h'), c('3h')],
        [c('9c'), c('2s')],
      ],
      firstCard: c('4h'),
    });

    const result = applyAction(state, 'p2', {
      type: 'PLAY_CARD',
      card: c('Ah'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      // Still p2's turn — must play or draw
      expect(result.newState.players[result.newState.currentPlayerIndex].id).toBe('p2');
      expect(result.newState.pendingEffect?.type).toBe('ace-chain');
    }
  });

  it('should allow chaining Aces', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Ah'), c('Ad'), c('3d')],
        [c('9c'), c('2s')],
      ],
      firstCard: c('4h'),
    });

    let result = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Ah') });
    expect(result.ok).toBe(true);

    if (result.ok) {
      result = applyAction(result.newState, 'p2', { type: 'PLAY_CARD', card: c('Ad') });
      expect(result.ok).toBe(true);

      if (result.ok) {
        // Can finish with 3d (matches diamond suit of last Ace)
        result = applyAction(result.newState, 'p2', { type: 'PLAY_CARD', card: c('3d') });
        expect(result.ok).toBe(true);
      }
    }
  });

  it('should allow drawing during Ace chain and ending turn', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Ah'), c('9c')],
        [c('9s'), c('2s')],
      ],
      firstCard: c('4h'),
      remainingDeck: [c('Kd')],
    });

    let result = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Ah') });
    expect(result.ok).toBe(true);

    if (result.ok) {
      // p2 has 9c which doesn't match hearts — draw
      result = applyAction(result.newState, 'p2', { type: 'DRAW_CARD' });
      expect(result.ok).toBe(true);

      if (result.ok) {
        // After draw, ace chain cleared but player stays on turn
        expect(result.newState.pendingEffect).toBeNull();
        expect(result.newState.players[result.newState.currentPlayerIndex].id).toBe('p2');

        // p2 passes to end turn
        result = applyAction(result.newState, 'p2', { type: 'PASS_TURN' });
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.newState.players[result.newState.currentPlayerIndex].id).toBe('p3');
        }
      }
    }
  });
});

// ─── Card Effects ───

describe('Card Effects', () => {
  it('2 — should give a card to the next player', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('2h'), c('9c'), c('3d')],
        [c('9s'), c('Ks')],
      ],
      firstCard: c('4h'),
    });

    const result = applyAction(state, 'p2', {
      type: 'PLAY_CARD',
      card: c('2h'),
      giveCard: c('9c'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const p2 = result.newState.players.find(p => p.id === 'p2')!;
      const p3 = result.newState.players.find(p => p.id === 'p3')!;
      expect(p2.hand.length).toBe(1); // had 3, played 1, gave 1
      expect(p3.hand.some(c => cardEquals(c, { value: 9, suit: 'clubs' }))).toBe(true);
    }
  });

  it('2 as last card — should win with 3 points', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('2h')],
        [c('9s'), c('Ks')],
      ],
      firstCard: c('4h'),
    });

    const result = applyAction(state, 'p2', {
      type: 'PLAY_CARD',
      card: c('2h'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.newState.phase).toBe('finished');
      const gameOver = result.events.find(e => e.type === 'GAME_OVER');
      expect(gameOver).toBeDefined();
      if (gameOver?.type === 'GAME_OVER') {
        expect(gameOver.points).toBe(3);
        expect(gameOver.winnerId).toBe('p2');
      }
    }
  });

  it('2 played + give card = win with 1 point', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('2h'), c('9c')],
        [c('9s'), c('Ks')],
      ],
      firstCard: c('4h'),
    });

    const result = applyAction(state, 'p2', {
      type: 'PLAY_CARD',
      card: c('2h'),
      giveCard: c('9c'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.newState.phase).toBe('finished');
      const gameOver = result.events.find(e => e.type === 'GAME_OVER');
      expect(gameOver).toBeDefined();
      if (gameOver?.type === 'GAME_OVER') {
        expect(gameOver.points).toBe(1);
      }
    }
  });

  it('3 — previous player draws a card', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('3d'), c('9c')],
        [c('9s'), c('Ks')],
      ],
      firstCard: c('4d'),
      remainingDeck: [c('Qh')],
    });

    const p1Before = state.players.find(p => p.id === 'p1')!.hand.length;

    const result = applyAction(state, 'p2', {
      type: 'PLAY_CARD',
      card: c('3d'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const p1After = result.newState.players.find(p => p.id === 'p1')!.hand.length;
      expect(p1After).toBe(p1Before + 1);
    }
  });

  it('6 — next two players draw a card each', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('6d'), c('9c')],
        [c('9s'), c('Ks')],
        [c('Qh'), c('3c')],
      ],
      firstCard: c('4d'),
      remainingDeck: [c('2h'), c('7s')],
    });

    const result = applyAction(state, 'p2', {
      type: 'PLAY_CARD',
      card: c('6d'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const p3 = result.newState.players.find(p => p.id === 'p3')!;
      const p4 = result.newState.players.find(p => p.id === 'p4')!;
      expect(p3.hand.length).toBe(3); // 2 + 1 drawn
      expect(p4.hand.length).toBe(3); // 2 + 1 drawn
    }
  });

  it('8 — skip next player', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('8d'), c('9c')],
        [c('9s'), c('Ks')],
      ],
      firstCard: c('4d'),
    });

    const result = applyAction(state, 'p2', {
      type: 'PLAY_CARD',
      card: c('8d'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      // p3 is skipped, turn goes to p1
      expect(result.newState.players[result.newState.currentPlayerIndex].id).toBe('p1');
    }
  });

  it('9 of diamonds — all others draw', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('9d'), c('9c')],
        [c('9s'), c('Ks')],
      ],
      firstCard: c('4d'),
      remainingDeck: [c('2h'), c('7s')],
    });

    const result = applyAction(state, 'p2', {
      type: 'PLAY_CARD',
      card: c('9d'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const p1 = result.newState.players.find(p => p.id === 'p1')!;
      const p3 = result.newState.players.find(p => p.id === 'p3')!;
      expect(p1.hand.length).toBe(3); // 2 + 1
      expect(p3.hand.length).toBe(3); // 2 + 1
    }
  });

  it('normal 9 (not diamonds) — no effect', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('9h'), c('9c')],
        [c('9s'), c('Ks')],
      ],
      firstCard: c('4h'),
    });

    const result = applyAction(state, 'p2', {
      type: 'PLAY_CARD',
      card: c('9h'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      // No one drew extra cards
      const p1 = result.newState.players.find(p => p.id === 'p1')!;
      const p3 = result.newState.players.find(p => p.id === 'p3')!;
      expect(p1.hand.length).toBe(2);
      expect(p3.hand.length).toBe(2);
    }
  });

  it('10 — reverse direction', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('10d'), c('9c')],
        [c('9s'), c('Ks')],
      ],
      firstCard: c('4d'),
    });

    expect(state.direction).toBe(1);

    const result = applyAction(state, 'p2', {
      type: 'PLAY_CARD',
      card: c('10d'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.newState.direction).toBe(-1);
      // Turn goes back to p1 (reversed)
      expect(result.newState.players[result.newState.currentPlayerIndex].id).toBe('p1');
    }
  });
});

// ─── Jack (Wild Card) ───

describe('Jack', () => {
  it('should allow playing Jack on any card', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Jc'), c('9c')],
        [c('9s'), c('Ks')],
      ],
      firstCard: c('4h'), // hearts — Jack of clubs should still work
    });

    const result = applyAction(state, 'p2', {
      type: 'PLAY_CARD',
      card: c('Jc'),
      declaredSuit: 'spades',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const houseChanged = result.events.find(e => e.type === 'HOUSE_CHANGED');
      expect(houseChanged).toBeDefined();
    }
  });

  it('should reject Jack without declared suit', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Jc'), c('9c')],
        [c('9s'), c('Ks')],
      ],
      firstCard: c('4h'),
    });

    const result = applyAction(state, 'p2', {
      type: 'PLAY_CARD',
      card: c('Jc'),
    });

    expect(result.ok).toBe(false);
  });

  it('finish with Jack — 2 points', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Jc')],
        [c('9s'), c('Ks')],
      ],
      firstCard: c('4h'),
    });

    const result = applyAction(state, 'p2', {
      type: 'PLAY_CARD',
      card: c('Jc'),
      declaredSuit: 'hearts',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.newState.phase).toBe('finished');
      const gameOver = result.events.find(e => e.type === 'GAME_OVER');
      expect(gameOver).toBeDefined();
      if (gameOver?.type === 'GAME_OVER') {
        expect(gameOver.points).toBe(2);
      }
    }
  });

  it('should not allow Jack to counter a chain reaction', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7h'), c('9c')],
        [c('Jd'), c('Ks')],
      ],
      firstCard: c('4h'),
    });

    // p2 plays 7
    let result = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(result.ok).toBe(true);

    if (result.ok) {
      // p3 tries to play Jack — should fail
      result = applyAction(result.newState, 'p3', {
        type: 'PLAY_CARD',
        card: c('Jd'),
        declaredSuit: 'hearts',
      });
      expect(result.ok).toBe(false);
    }
  });
});

// ─── King (Saw) ───

describe('King', () => {
  it('should skip next player and they draw 1', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Kd'), c('9c')],
        [c('9s'), c('2s')],
      ],
      firstCard: c('4d'),
      remainingDeck: [c('Qh')],
    });

    const p3Before = state.players.find(p => p.id === 'p3')!.hand.length;

    const result = applyAction(state, 'p2', {
      type: 'PLAY_CARD',
      card: c('Kd'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const p3After = result.newState.players.find(p => p.id === 'p3')!.hand.length;
      expect(p3After).toBe(p3Before + 1);
      // Turn goes to p1 (p3 skipped)
      expect(result.newState.players[result.newState.currentPlayerIndex].id).toBe('p1');
    }
  });
});

// ─── Chain Reactions (7-8-10) ───

describe('Chain Reactions', () => {
  it('7 — next player must draw 2 if no counter', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7h'), c('9c')],
        [c('9s'), c('Ks')],
      ],
      firstCard: c('4h'),
      remainingDeck: [c('2h'), c('3d')],
    });

    let result = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(result.ok).toBe(true);

    if (result.ok) {
      // p3 has no counter — first draw transitions to seven-penalty
      result = applyAction(result.newState, 'p3', { type: 'DRAW_CARD' });
      expect(result.ok).toBe(true);

      if (result.ok) {
        const p3a = result.newState.players.find(p => p.id === 'p3')!;
        expect(p3a.hand.length).toBe(3); // 2 + 1 drawn
        expect(result.newState.pendingEffect).toEqual({
          type: 'seven-penalty', penalty: 2, drawn: 1, suit: 'hearts',
        });

        // p3 draws second mandatory card
        result = applyAction(result.newState, 'p3', { type: 'DRAW_CARD' });
        expect(result.ok).toBe(true);

        if (result.ok) {
          const p3b = result.newState.players.find(p => p.id === 'p3')!;
          expect(p3b.hand.length).toBe(4); // 2 + 2 drawn

          // p3 passes to end turn
          result = applyAction(result.newState, 'p3', { type: 'PASS_TURN' });
          expect(result.ok).toBe(true);
          if (result.ok) {
            expect(result.newState.pendingEffect).toBeNull();
          }
        }
      }
    }
  });

  it('7 chain — two 7s accumulate', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7h'), c('9c')],
        [c('7d'), c('Ks')],
      ],
      firstCard: c('4h'),
      remainingDeck: [c('2h'), c('3d'), c('Qc'), c('6s')],
    });

    let result = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(result.ok).toBe(true);

    if (result.ok) {
      result = applyAction(result.newState, 'p3', { type: 'PLAY_CARD', card: c('7d') });
      expect(result.ok).toBe(true);

      if (result.ok) {
        expect(result.newState.pendingEffect).toEqual({
          type: 'seven-chain',
          penalty: 4,
          suit: 'diamonds', // suit of the last 7 played
        });
        // p1 must counter or draw 4
        expect(result.newState.players[result.newState.currentPlayerIndex].id).toBe('p1');
      }
    }
  });

  it('7 + 10 — reverse direction', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7h'), c('9c')],
        [c('10h'), c('Ks')],
      ],
      firstCard: c('4h'),
      remainingDeck: [c('2h'), c('3d')],
    });

    let result = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(result.ok).toBe(true);

    if (result.ok) {
      result = applyAction(result.newState, 'p3', { type: 'PLAY_CARD', card: c('10h') });
      expect(result.ok).toBe(true);

      if (result.ok) {
        expect(result.newState.direction).toBe(-1);
        // Penalty stays at 2, direction reversed — back to p2
        expect(result.newState.players[result.newState.currentPlayerIndex].id).toBe('p2');
        expect((result.newState.pendingEffect as any)?.penalty).toBe(2);
      }
    }
  });

  it('7 + 8 (same suit) redirect — penalty goes to player 2 ahead', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7h'), c('9c')],
        [c('8h'), c('Ks')],
        [c('3c'), c('6d')],
      ],
      firstCard: c('4h'),
      remainingDeck: [c('2c'), c('3d')],
    });

    let result = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(result.ok).toBe(true);

    if (result.ok) {
      result = applyAction(result.newState, 'p3', {
        type: 'PLAY_CARD',
        card: c('8h'),
        chainChoice: 'redirect',
      });
      expect(result.ok).toBe(true);

      if (result.ok) {
        // Penalty redirected to player 2 ahead of p3 = p1, draws incrementally
        const p1a = result.newState.players.find(p => p.id === 'p1')!;
        expect(p1a.hand.length).toBe(3); // 2 + 1 drawn
        expect(result.newState.players[result.newState.currentPlayerIndex].id).toBe('p1');
        expect(result.newState.pendingEffect).toEqual({
          type: 'seven-penalty', penalty: 2, drawn: 1, suit: 'hearts',
        });

        // p1 draws second card
        result = applyAction(result.newState, 'p1', { type: 'DRAW_CARD' });
        expect(result.ok).toBe(true);

        if (result.ok) {
          // p1 passes to end turn
          result = applyAction(result.newState, 'p1', { type: 'PASS_TURN' });
          expect(result.ok).toBe(true);
          if (result.ok) {
            expect(result.newState.pendingEffect).toBeNull();
          }
        }
      }
    }
  });

  it('7 + 8 (same suit) add — adds 3 to penalty', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7h'), c('9c')],
        [c('8h'), c('Ks')],
        [c('3c'), c('6d')],
      ],
      firstCard: c('4h'),
      remainingDeck: [c('2c'), c('3d'), c('Qh'), c('5d'), c('6s')],
    });

    let result = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(result.ok).toBe(true);

    if (result.ok) {
      result = applyAction(result.newState, 'p3', {
        type: 'PLAY_CARD',
        card: c('8h'),
        chainChoice: 'add',
      });
      expect(result.ok).toBe(true);

      if (result.ok) {
        expect((result.newState.pendingEffect as any)?.penalty).toBe(5); // 2 + 3
      }
    }
  });

  it('should reject 8 of wrong suit in standard mode', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7h'), c('9c')],
        [c('8c'), c('Ks')],
      ],
      firstCard: c('4h'),
    });

    let result = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(result.ok).toBe(true);

    if (result.ok) {
      result = applyAction(result.newState, 'p3', {
        type: 'PLAY_CARD',
        card: c('8c'),
        chainChoice: 'add',
      });
      expect(result.ok).toBe(false);
    }
  });

  it('should not allow pass during chain — must draw', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('7h'), c('9c')],
        [c('9s'), c('Ks')],
      ],
      firstCard: c('4h'),
    });

    let result = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(result.ok).toBe(true);

    if (result.ok) {
      const passResult = applyAction(result.newState, 'p3', { type: 'PASS_TURN' });
      expect(passResult.ok).toBe(false);
      if (!passResult.ok) {
        expect(passResult.reason).toContain('chain reaction');
      }
    }
  });
});

// ─── Winning & Scoring ───

describe('Winning & Scoring', () => {
  it('normal finish — 1 point', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('4d')],
        [c('9s'), c('Ks')],
      ],
      firstCard: c('4h'),
    });

    const result = applyAction(state, 'p2', {
      type: 'PLAY_CARD',
      card: c('4d'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.newState.phase).toBe('finished');
      const gameOver = result.events.find(e => e.type === 'GAME_OVER');
      expect(gameOver).toBeDefined();
      if (gameOver?.type === 'GAME_OVER') {
        expect(gameOver.points).toBe(1);
      }
    }
  });

  it('loser is player with highest hand value', () => {
    const state = createTestState({
      hands: [
        [c('Ks'), c('Qh')], // K=13, Q=12 = 25
        [c('4d')],
        [c('2s'), c('3s')], // 2+3 = 5
      ],
      firstCard: c('4h'),
    });

    const result = applyAction(state, 'p2', {
      type: 'PLAY_CARD',
      card: c('4d'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const gameOver = result.events.find(e => e.type === 'GAME_OVER');
      expect(gameOver).toBeDefined();
      if (gameOver?.type === 'GAME_OVER') {
        expect(gameOver.loserId).toBe('p1'); // p1 has highest hand value
      }
    }
  });

  it('Jack multiplier — Jack doubles hand value', () => {
    // Verify the handValue function
    expect(handValue([c('Jh'), c('4s')])).toBe((11 + 4) * 2); // 30
    expect(handValue([c('Jh'), c('Jd')])).toBe((11 + 11) * 2 * 2); // 88
    expect(handValue([c('Ks'), c('Qh')])).toBe(25); // no multiplier
  });

  it('tie for highest — reversal', () => {
    const state = createTestState({
      hands: [
        [c('Ks'), c('2h')], // 13 + 2 = 15
        [c('4d')],
        [c('5s'), c('10h')], // 5 + 10 = 15 — tie with p1!
      ],
      firstCard: c('4h'),
    });

    const result = applyAction(state, 'p2', {
      type: 'PLAY_CARD',
      card: c('4d'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const gameOver = result.events.find(e => e.type === 'GAME_OVER');
      expect(gameOver).toBeDefined();
      if (gameOver?.type === 'GAME_OVER') {
        expect(gameOver.reversed).toBe(true);
        expect(gameOver.loserId).toBe('p2'); // winner becomes loser
      }
    }
  });
});

// ─── One-Card Announcement ───

describe('One-Card Announcement', () => {
  it('should allow announcing one card', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('4d'), c('9c')],
        [c('9s'), c('Ks')],
      ],
      firstCard: c('4h'),
    });

    // p2 plays, goes down to 1 card
    let result = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('4d') });
    expect(result.ok).toBe(true);

    if (result.ok) {
      // p2 announces (can do it even though it's not their turn)
      result = applyAction(result.newState, 'p2', { type: 'ANNOUNCE_ONE_CARD' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        const p2 = result.newState.players.find(p => p.id === 'p2')!;
        expect(p2.hasAnnouncedOneCard).toBe(true);
      }
    }
  });

  it('should penalize on valid challenge', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('4d'), c('9c')],
        [c('9s'), c('Ks')],
      ],
      firstCard: c('4h'),
      remainingDeck: [c('Qd')],
    });

    // p2 plays, goes to 1 card but doesn't announce
    let result = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('4d') });
    expect(result.ok).toBe(true);

    if (result.ok) {
      // p1 challenges
      result = applyAction(result.newState, 'p1', {
        type: 'CHALLENGE_NO_ANNOUNCEMENT',
        targetPlayerId: 'p2',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        const p2 = result.newState.players.find(p => p.id === 'p2')!;
        expect(p2.hand.length).toBe(2); // 1 + 1 penalty
      }
    }
  });
});
