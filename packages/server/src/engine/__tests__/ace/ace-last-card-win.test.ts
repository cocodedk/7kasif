import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Ace — last card win', () => {
  it('should start ace chain even when ace is the last card (player must draw)', () => {
    // The game engine explicitly skips the win check for aces:
    // `if (player.hand.length === 0 && card.value !== 'ace')`
    // So playing ace as last card starts a chain — player has no cards to play and must draw.
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Ah')],
        [c('6d'), c('Ks')],
      ],
      firstCard: c('4h'),
      remainingDeck: [c('Qd')],
    });

    log('p2 plays A♥ (last card)');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Ah') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: ace chain starts, game continues (not a win)');
    // Ace chain starts — game is NOT finished
    expect(r1.newState.phase).toBe('playing');
    expect(r1.newState.pendingEffect).toEqual({ type: 'ace-chain', suit: 'hearts', acesPlayed: 1 });
    // Still p2's turn — must play matching suit or draw
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p2');

    log('p2 draws a card (empty hand, no matching suit)');
    // p2 has empty hand, must draw
    const r2 = applyAction(r1.newState, 'p2', { type: 'DRAW_CARD' });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: chain cleared, player stays on turn');
    expect(r2.newState.pendingEffect).toBeNull();
    expect(r2.newState.players[r2.newState.currentPlayerIndex].id).toBe('p2');
    const p2 = r2.newState.players.find(p => p.id === 'p2')!;
    expect(p2.hand.length).toBe(1); // drew 1 card

    log('p2 passes to end turn');
    const r3 = applyAction(r2.newState, 'p2', { type: 'PASS_TURN' });
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;
    expect(r3.newState.players[r3.newState.currentPlayerIndex].id).toBe('p3');
  });

  it('should win when 4 aces are played leaving hand empty', () => {
    // The only way to win with aces is the 4-ace chain
    // (calculateGameEnd is called from the ace-chain handler when hand is empty)
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Ah'), c('Ad'), c('Ac'), c('As')],
        [c('6d'), c('Ks')],
      ],
      firstCard: c('4h'),
    });

    let s = state;
    for (const ace of [c('Ah'), c('Ad'), c('Ac'), c('As')]) {
      log(`p2 plays ${ace.value}${ace.suit} (ace ${[c('Ah'), c('Ad'), c('Ac'), c('As')].indexOf(ace) + 1}/4)`);
      const r = applyAction(s, 'p2', { type: 'PLAY_CARD', card: ace });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      s = r.newState;
      if (s.phase === 'finished') {
        log('Verify: game won with 4-ace chain');
        const gameOver = (r as any).events.find((e: any) => e.type === 'GAME_OVER');
        expect(gameOver.winnerId).toBe('p2');
        expect(gameOver.points).toBe(4);
        return;
      }
    }
    // After 4 aces the game must be finished
    log('Verify: game finished after 4 aces');
    expect(s.phase).toBe('finished');
  });
});
