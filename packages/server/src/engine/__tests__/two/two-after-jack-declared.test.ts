import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Two — played after Jack declared suit', () => {
  it('should allow 2 matching declared suit and give card to next player', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],           // p1
        [c('Jd'), c('9c')],           // p2 — plays Jack declaring hearts
        [c('2h'), c('5s'), c('3c')],  // p3 — plays 2h matching declared hearts
      ],
      firstCard: c('4d'),
      currentPlayerIndex: 1,
    });

    log('p2 plays J♦ declaring hearts');
    const r1 = applyAction(state, 'p2', {
      type: 'PLAY_CARD',
      card: c('Jd'),
      declaredSuit: 'hearts',
    });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: turn advances to p3');
    expect(r1.newState.players[r1.newState.currentPlayerIndex].id).toBe('p3');

    log('p3 plays 2♥ (matches declared hearts) giving 5♠ to next player');
    const r2 = applyAction(r1.newState, 'p3', {
      type: 'PLAY_CARD',
      card: c('2h'),
      giveCard: c('5s'),
    });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: p1 received 5♠ (next player after p3 in direction)');
    const p1 = r2.newState.players.find(p => p.id === 'p1')!;
    expect(p1.hand).toContainEqual(c('5s'));

    log('Verify: turn advances to p1');
    expect(r2.newState.players[r2.newState.currentPlayerIndex].id).toBe('p1');
  });
});
