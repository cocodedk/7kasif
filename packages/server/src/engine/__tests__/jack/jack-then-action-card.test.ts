import { describe, it, expect } from 'vitest';
import { applyAction } from '../../game.js';
import { createTestState, c, log } from '../helpers.js';

describe('Jack — followed by action cards of declared suit', () => {
  it('should allow 7 of declared suit and start chain', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Jc'), c('9h')],
        [c('7h'), c('Ks')],
      ],
      firstCard: c('4d'),
    });

    log('p2 plays J♣ declaring hearts');
    const r1 = applyAction(state, 'p2', {
      type: 'PLAY_CARD',
      card: c('Jc'),
      declaredSuit: 'hearts',
    });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 plays 7♥ (matches declared hearts) — starts chain');
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('7h') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: seven-chain started');
    expect(r2.newState.pendingEffect).not.toBeNull();
    expect(r2.newState.pendingEffect!.type).toBe('seven-chain');
  });

  it('should allow 10 of declared suit and reverse direction', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Jc'), c('9h')],
        [c('10h'), c('Ks')],
      ],
      firstCard: c('4d'),
    });

    log('p2 plays J♣ declaring hearts');
    const r1 = applyAction(state, 'p2', {
      type: 'PLAY_CARD',
      card: c('Jc'),
      declaredSuit: 'hearts',
    });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 plays 10♥ — reverses direction');
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('10h') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: direction reversed');
    expect(r2.newState.direction).toBe(-1);
  });

  it('should allow ace of declared suit and start ace-chain', () => {
    const state = createTestState({
      hands: [
        [c('4s'), c('5s')],
        [c('Jc'), c('9h')],
        [c('Ah'), c('Ks')],
      ],
      firstCard: c('4d'),
    });

    log('p2 plays J♣ declaring hearts');
    const r1 = applyAction(state, 'p2', {
      type: 'PLAY_CARD',
      card: c('Jc'),
      declaredSuit: 'hearts',
    });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    log('p3 plays A♥ (matches declared hearts) — starts ace chain');
    const r2 = applyAction(r1.newState, 'p3', { type: 'PLAY_CARD', card: c('Ah') });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    log('Verify: ace-chain started');
    expect(r2.newState.pendingEffect).not.toBeNull();
    expect(r2.newState.pendingEffect!.type).toBe('ace-chain');
  });
});
