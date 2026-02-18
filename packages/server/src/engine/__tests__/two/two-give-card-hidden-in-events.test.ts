import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';
import { filterEventsForPlayer } from '../../view.js';
import type { GameEvent } from '@hafte-kasif/shared';

describe('Two — given card hidden in events for other players', () => {
  it('should hide card in CARD_GIVEN event for uninvolved players', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],           // p1
        [c('2d'), c('9c'), c('Ks')],  // p2 — will play 2 and give 9c
        [c('6h'), c('8s')],           // p3
      ],
      firstCard: c('4d'),
      currentPlayerIndex: 1,
    });

    log('p2 plays 2♦ and gives 9♣ to p3');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('2d'), giveCard: c('9c') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    const giveEvent = r1.events.find(e => e.type === 'CARD_GIVEN');
    expect(giveEvent).toBeDefined();
    expect(giveEvent!.type === 'CARD_GIVEN' && giveEvent!.card).toEqual(c('9c'));

    log('Filter for p2 (giver) — should see the card');
    const p2Events = filterEventsForPlayer(r1.events, 'p2', state);
    const p2Give = p2Events.find(e => e.type === 'CARD_GIVEN')!;
    expect(p2Give.type === 'CARD_GIVEN' && p2Give.card).toEqual(c('9c'));

    log('Filter for p3 (receiver) — should see the card');
    const p3Events = filterEventsForPlayer(r1.events, 'p3', state);
    const p3Give = p3Events.find(e => e.type === 'CARD_GIVEN')!;
    expect(p3Give.type === 'CARD_GIVEN' && p3Give.card).toEqual(c('9c'));

    log('Filter for p1 (bystander) — should NOT see the card');
    const p1Events = filterEventsForPlayer(r1.events, 'p1', state);
    const p1Give = p1Events.find(e => e.type === 'CARD_GIVEN')!;
    expect(p1Give.type === 'CARD_GIVEN' && p1Give.card).toBeNull();
  });

  it('should show card in CARD_GIVEN event if card was already revealed', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],           // p1
        [c('2d'), c('9c'), c('Ks')],  // p2 — will play 2 and give 9c
        [c('6h'), c('8s')],           // p3
      ],
      firstCard: c('4d'),
      currentPlayerIndex: 1,
    });

    // Pre-set: 9c was already revealed by queen
    state.players[1].revealedCards = [c('9c')];

    log('p2 plays 2♦ and gives 9♣ (already revealed) to p3');
    const r1 = applyAction(state, 'p2', { type: 'PLAY_CARD', card: c('2d'), giveCard: c('9c') });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('Filter for p1 (bystander) — should see the card because it was revealed');
    const p1Events = filterEventsForPlayer(r1.events, 'p1', state);
    const p1Give = p1Events.find(e => e.type === 'CARD_GIVEN')!;
    expect(p1Give.type === 'CARD_GIVEN' && p1Give.card).toEqual(c('9c'));
  });
});
