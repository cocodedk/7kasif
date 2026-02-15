import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Queen — no draw effect on other players', () => {
  it('should not cause any player to draw cards', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Qd'), c('9c')],
        [c('Ks'), c('3h')],
        [c('6c'), c('2s')],
      ],
      firstCard: c('4d'),
    });

    log('p2 plays Q♦');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('Qd') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Verify: p1 hand unchanged');
    const p1 = r1.newState.players.find(p => p.id === 'p1')!;
    expect(p1.hand.length).toBe(2);

    log('Verify: p3 hand unchanged');
    const p3 = r1.newState.players.find(p => p.id === 'p3')!;
    expect(p3.hand.length).toBe(2);

    log('Verify: p4 hand unchanged');
    const p4 = r1.newState.players.find(p => p.id === 'p4')!;
    expect(p4.hand.length).toBe(2);

    log('Verify: no CARD_DRAWN events');
    const drawEvents = r1.events.filter(e => e.type === 'CARD_DRAWN');
    expect(drawEvents.length).toBe(0);

    log('Verify: no PLAYER_SKIPPED events');
    const skipEvents = r1.events.filter(e => e.type === 'PLAYER_SKIPPED');
    expect(skipEvents.length).toBe(0);
  });
});
