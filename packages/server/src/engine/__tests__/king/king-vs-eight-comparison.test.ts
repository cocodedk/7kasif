import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('King vs Eight — King adds draw to skip', () => {
  it('should make skipped player draw (unlike 8 which only skips)', () => {
    const kingState = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Kd'), c('9c')],
        [c('3h'), c('Qh')],
      ],
      firstCard: c('4d'),
      remainingDeck: [c('Jh'), c('5c')],
    });

    const eightState = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('8d'), c('9c')],
        [c('3h'), c('Qh')],
      ],
      firstCard: c('4d'),
      remainingDeck: [c('Jh'), c('5c')],
    });

    log('Play King: p2 plays K♦');
    const kr = applyAction(kingState, 'p2', { type: 'PLAY_CARD', card: c('Kd') });
    expect(kr.ok).toBe(true);
    if (!kr.ok) return;

    log('Play Eight: p2 plays 8♦');
    const er = applyAction(eightState, 'p2', { type: 'PLAY_CARD', card: c('8d') });
    expect(er.ok).toBe(true);
    if (!er.ok) return;

    log('Verify: both skip p3');
    const kSkip = kr.events.find(e => e.type === 'PLAYER_SKIPPED');
    const eSkip = er.events.find(e => e.type === 'PLAYER_SKIPPED');
    expect(kSkip!.playerId).toBe('p3');
    expect(eSkip!.playerId).toBe('p3');

    log('Verify: King made p3 draw (now 3), Eight did not (still 2)');
    const kp3 = kr.newState.players.find(p => p.id === 'p3')!;
    const ep3 = er.newState.players.find(p => p.id === 'p3')!;
    expect(kp3.hand.length).toBe(3); // drew 1
    expect(ep3.hand.length).toBe(2); // no draw
  });
});
