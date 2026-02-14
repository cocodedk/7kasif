import { describe, it, expect } from 'vitest';
import { createEmptyPlayerScore, applyPoints } from '@hafte-kasif/shared';

describe('Scoring Table', () => {
  it('should create empty score with one row of 4 null cells', () => {
    const score = createEmptyPlayerScore('p1', 'Alice');
    expect(score.rows).toHaveLength(1);
    expect(score.rows[0].cells).toEqual([null, null, null, null]);
    expect(score.plusClusters).toBe(0);
    expect(score.minusClusters).toBe(0);
    expect(score.netScore).toBe(0);
  });

  it('should fill 1 winning point into current row', () => {
    const score = createEmptyPlayerScore('p1', 'Alice');
    const updated = applyPoints(score, 'I', 1);
    expect(updated.rows[0].cells).toEqual(['I', null, null, null]);
    expect(updated.plusClusters).toBe(0);
  });

  it('should fill 3 winning points into current row', () => {
    const score = createEmptyPlayerScore('p1', 'Alice');
    const updated = applyPoints(score, 'I', 3);
    expect(updated.rows[0].cells).toEqual(['I', 'I', 'I', null]);
  });

  it('should complete a row of 4 I = +1 cluster', () => {
    let score = createEmptyPlayerScore('p1', 'Alice');
    score = applyPoints(score, 'I', 3);
    score = applyPoints(score, 'I', 1);
    expect(score.rows[0].cells).toEqual(['I', 'I', 'I', 'I']);
    expect(score.plusClusters).toBe(1);
    expect(score.minusClusters).toBe(0);
    expect(score.netScore).toBe(1);
  });

  it('should complete a row of 4 X = -1 cluster', () => {
    let score = createEmptyPlayerScore('p1', 'Alice');
    score = applyPoints(score, 'X', 2);
    score = applyPoints(score, 'X', 2);
    expect(score.rows[0].cells).toEqual(['X', 'X', 'X', 'X']);
    expect(score.minusClusters).toBe(1);
    expect(score.netScore).toBe(-1);
  });

  it('should handle mixed row = 0 points', () => {
    let score = createEmptyPlayerScore('p1', 'Alice');
    score = applyPoints(score, 'I', 2);
    score = applyPoints(score, 'X', 2);
    expect(score.rows[0].cells).toEqual(['I', 'I', 'X', 'X']);
    expect(score.plusClusters).toBe(0);
    expect(score.minusClusters).toBe(0);
    expect(score.netScore).toBe(0);
  });

  it('should overflow into next row', () => {
    let score = createEmptyPlayerScore('p1', 'Alice');
    score = applyPoints(score, 'I', 3);
    // Now add 2 more — 1 fills current, 1 overflows to next
    score = applyPoints(score, 'I', 2);
    expect(score.rows).toHaveLength(2);
    expect(score.rows[0].cells).toEqual(['I', 'I', 'I', 'I']);
    expect(score.rows[1].cells).toEqual(['I', null, null, null]);
    expect(score.plusClusters).toBe(1);
  });

  it('should handle 4-Ace chain fill (new separate row)', () => {
    let score = createEmptyPlayerScore('p1', 'Alice');
    // Player has some marks in current row
    score = applyPoints(score, 'I', 2);
    // Ace chain full — should create a brand new row, not touch current
    score = applyPoints(score, 'I', 4, true);
    expect(score.rows).toHaveLength(2);
    // First row unchanged
    expect(score.rows[0].cells).toEqual(['I', 'I', null, null]);
    // New row is full
    expect(score.rows[1].cells).toEqual(['I', 'I', 'I', 'I']);
    expect(score.plusClusters).toBe(1);
    expect(score.netScore).toBe(1);
  });

  it('should handle multiple rounds of scoring', () => {
    let score = createEmptyPlayerScore('p1', 'Alice');

    // Round 1: Win 1
    score = applyPoints(score, 'I', 1);
    expect(score.rows[0].cells).toEqual(['I', null, null, null]);

    // Round 2: Lose 1
    score = applyPoints(score, 'X', 1);
    expect(score.rows[0].cells).toEqual(['I', 'X', null, null]);

    // Round 3: Win 2 (Jack finish)
    score = applyPoints(score, 'I', 2);
    expect(score.rows[0].cells).toEqual(['I', 'X', 'I', 'I']);
    // Mixed row, 0 points
    expect(score.plusClusters).toBe(0);

    // Round 4: Win 1
    score = applyPoints(score, 'I', 1);
    expect(score.rows).toHaveLength(2);
    expect(score.rows[1].cells).toEqual(['I', null, null, null]);
  });

  it('net score across multiple clusters', () => {
    let score = createEmptyPlayerScore('p1', 'Alice');
    // Fill row 1 with all I
    score = applyPoints(score, 'I', 4);
    // Fill row 2 with all X
    score = applyPoints(score, 'X', 4);
    // Fill row 3 with all I
    score = applyPoints(score, 'I', 4);

    expect(score.plusClusters).toBe(2);
    expect(score.minusClusters).toBe(1);
    expect(score.netScore).toBe(1);
  });
});

describe('Tournament RoomManager', () => {
  it('should rotate dealer each round', async () => {
    const { RoomManager } = await import('../../rooms/RoomManager.js');
    const rm = new RoomManager();
    const room = rm.createRoom('h', 'Host', 'standard');
    rm.joinRoom(room.code, 'p2', 'P2');
    rm.joinRoom(room.code, 'p3', 'P3');

    // Round 1: dealer is player index 0 (h)
    const state1 = rm.startGame(room.code, 3);
    expect(state1).not.toBeNull();
    expect(state1!.dealerId).toBe('h');

    // Record round result
    rm.recordRoundResult(room.code, 'p2', 'p3', 1, false, '4', false);

    // Round 2: dealer rotates to player index 1 (p2)
    const state2 = rm.startGame(room.code, 3);
    expect(state2).not.toBeNull();
    expect(state2!.dealerId).toBe('p2');

    rm.recordRoundResult(room.code, 'h', 'p3', 1, false, '5', false);

    // Round 3: dealer rotates to player index 2 (p3)
    const state3 = rm.startGame(room.code, 3);
    expect(state3).not.toBeNull();
    expect(state3!.dealerId).toBe('p3');
  });

  it('should accumulate scores across rounds', async () => {
    const { RoomManager } = await import('../../rooms/RoomManager.js');
    const rm = new RoomManager();
    const room = rm.createRoom('h', 'Host', 'standard');
    rm.joinRoom(room.code, 'p2', 'P2');
    rm.joinRoom(room.code, 'p3', 'P3');

    rm.startGame(room.code, 3);

    // Round 1: h wins, p3 loses, 1 point
    const t1 = rm.recordRoundResult(room.code, 'h', 'p3', 1, false, '4', false);
    expect(t1).not.toBeNull();
    const hScore1 = t1!.playerScores.find(s => s.playerId === 'h')!;
    const p3Score1 = t1!.playerScores.find(s => s.playerId === 'p3')!;
    expect(hScore1.rows[0].cells[0]).toBe('I');
    expect(p3Score1.rows[0].cells[0]).toBe('X');

    // Round 2: p2 wins with Jack (2 points), h loses
    rm.startGame(room.code, 3);
    const t2 = rm.recordRoundResult(room.code, 'p2', 'h', 2, false, 'jack', false);
    const hScore2 = t2!.playerScores.find(s => s.playerId === 'h')!;
    const p2Score2 = t2!.playerScores.find(s => s.playerId === 'p2')!;
    // h: [I, X, X, null] — first I from round 1, then 2 X from losing
    expect(hScore2.rows[0].cells).toEqual(['I', 'X', 'X', null]);
    // p2: [I, I, null, null] — 2 points from Jack win
    expect(p2Score2.rows[0].cells).toEqual(['I', 'I', null, null]);
  });

  it('should track tournament view with rounds', async () => {
    const { RoomManager } = await import('../../rooms/RoomManager.js');
    const rm = new RoomManager();
    const room = rm.createRoom('h', 'Host', 'standard');
    rm.joinRoom(room.code, 'p2', 'P2');
    rm.joinRoom(room.code, 'p3', 'P3');
    rm.startGame(room.code, 3);

    rm.recordRoundResult(room.code, 'h', 'p3', 1, false, '4', false);

    const view = rm.getTournamentView(room.code);
    expect(view).not.toBeNull();
    expect(view!.rounds).toHaveLength(1);
    expect(view!.rounds[0].winnerId).toBe('h');
    expect(view!.rounds[0].loserId).toBe('p3');
    expect(view!.currentRound).toBe(2);
    expect(view!.playerScores).toHaveLength(3);
  });

  it('should handle end session', async () => {
    const { RoomManager } = await import('../../rooms/RoomManager.js');
    const rm = new RoomManager();
    const room = rm.createRoom('h', 'Host', 'standard');
    rm.joinRoom(room.code, 'p2', 'P2');
    rm.joinRoom(room.code, 'p3', 'P3');
    rm.startGame(room.code, 3);
    rm.recordRoundResult(room.code, 'h', 'p3', 1, false, '4', false);

    const ended = rm.endSession(room.code);
    expect(ended).not.toBeNull();
    expect(room.tournament.isActive).toBe(false);
  });
});
