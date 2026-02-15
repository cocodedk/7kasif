import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Seven — 7 + 7 + 8 add', () => {
  it('should add 3 to accumulated penalty (4+3=7)', () => {
    // 3-player game so after p2→p3 play 7s, turn goes to p1
    const state = createTestState({
      hands: [
        [c('8h'), c('5s')],       // p1
        [c('7h'), c('9c')],       // p2
        [c('7d'), c('Ks')],       // p3
      ],
      firstCard: c('4h'),
    });

    log('p2 plays 7♥');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('7h') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 plays 7♦ (adds 2 to penalty: 2+2=4)');
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('7d') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: turn goes to p1');
    // In 3-player game, after p3 plays, turn goes to p1
    expect(r2.newState.players[r2.newState.currentPlayerIndex].id).toBe('p1');

    log('p1 plays 8♥ and adds 3 to penalty (4+3=7)');
    // p1 adds with 8h
    const r3 = applyAction(r2.newState, 'p1', {
      type: 'PLAY_CARD',
      card: c('8h'),
      chainChoice: 'add',
    });
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;

    log('Verify: penalty=7 (4+3), turn continues to p2');
    expect((r3.newState.pendingEffect as any)?.penalty).toBe(7); // 4 + 3
    // Chain continues to p2
    expect(r3.newState.players[r3.newState.currentPlayerIndex].id).toBe('p2');
  });
});
