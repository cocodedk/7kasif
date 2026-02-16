import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { vi } from 'vitest';
import { getTestPool, initTestDb, cleanTestDb, closeTestDb } from '../auth/test-db.js';

vi.mock('../../auth/db.js', () => {
  return {
    getPool: () => getTestPool(),
  };
});

import {
  saveTournament,
  saveSessionPlayers,
  saveRound,
  saveScores,
  endTournament,
  loadTournament,
} from '../../db/tournaments.js';
import { getLeaderboard, getPlayerStats, getTournamentHistory } from '../../db/leaderboard.js';
import type { PlayerScore } from '@hafte-kasif/shared';

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret';
  await initTestDb();
});

beforeEach(async () => {
  await cleanTestDb();
});

afterAll(async () => {
  await closeTestDb();
});

describe('saveTournament', () => {
  it('should create a session in the database', async () => {
    const sessionId = await saveTournament('session_123', 'ABCD', 'standard');
    expect(sessionId).toBeGreaterThan(0);

    const pool = getTestPool();
    const result = await pool.query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].session_code).toBe('session_123');
    expect(result.rows[0].room_code).toBe('ABCD');
    expect(result.rows[0].mode).toBe('standard');
    expect(result.rows[0].is_active).toBe(true);
  });
});

describe('saveRound', () => {
  it('should persist a round result', async () => {
    const sessionId = await saveTournament('session_123', 'ABCD', 'standard');
    const roundId = await saveRound(sessionId, 1, 7, 'Alice', 'Bob', 2, false, 'jack');

    expect(roundId).toBeGreaterThan(0);

    const pool = getTestPool();
    const result = await pool.query('SELECT * FROM rounds WHERE id = $1', [roundId]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].winner_name).toBe('Alice');
    expect(result.rows[0].loser_name).toBe('Bob');
    expect(result.rows[0].points).toBe(2);
    expect(result.rows[0].reversed).toBe(false);
    expect(result.rows[0].finishing_card).toBe('jack');
  });
});

describe('saveScores', () => {
  it('should persist final scores for session players', async () => {
    const sessionId = await saveTournament('session_123', 'ABCD', 'standard');
    await saveSessionPlayers(sessionId, [
      { userId: null, playerName: 'Alice' },
      { userId: null, playerName: 'Bob' },
    ]);

    const scores: PlayerScore[] = [
      {
        playerId: 'p1',
        playerName: 'Alice',
        rows: [{ cells: ['I', 'I', 'I', 'I'] }],
        plusClusters: 1,
        minusClusters: 0,
        netScore: 1,
      },
      {
        playerId: 'p2',
        playerName: 'Bob',
        rows: [{ cells: ['X', 'X', 'X', 'X'] }],
        plusClusters: 0,
        minusClusters: 1,
        netScore: -1,
      },
    ];

    await saveScores(sessionId, scores, new Map());

    const pool = getTestPool();
    const result = await pool.query(
      'SELECT * FROM session_players WHERE session_id = $1 ORDER BY player_name',
      [sessionId],
    );
    expect(result.rows).toHaveLength(2);

    const alice = result.rows[0];
    expect(alice.player_name).toBe('Alice');
    expect(alice.final_plus_clusters).toBe(1);
    expect(alice.final_net_score).toBe(1);

    const bob = result.rows[1];
    expect(bob.player_name).toBe('Bob');
    expect(bob.final_minus_clusters).toBe(1);
    expect(bob.final_net_score).toBe(-1);
  });
});

describe('loadTournament', () => {
  it('should reconstruct a TournamentView from the database', async () => {
    const sessionId = await saveTournament('session_123', 'ABCD', 'standard');
    await saveSessionPlayers(sessionId, [
      { userId: null, playerName: 'Alice' },
      { userId: null, playerName: 'Bob' },
    ]);
    await saveRound(sessionId, 1, 7, 'Alice', 'Bob', 1, false, '5');
    await saveRound(sessionId, 2, 5, 'Bob', 'Alice', 2, false, 'jack');

    const view = await loadTournament(sessionId);
    expect(view).not.toBeNull();
    expect(view!.sessionId).toBe('session_123');
    expect(view!.playerScores).toHaveLength(2);
    expect(view!.rounds).toHaveLength(2);
    expect(view!.rounds[0].roundNumber).toBe(1);
    expect(view!.rounds[1].roundNumber).toBe(2);
    expect(view!.currentRound).toBe(3);
  });
});

describe('leaderboard', () => {
  it('should aggregate scores across all tournaments', async () => {
    // Create a user
    const pool = getTestPool();
    const userResult = await pool.query(
      "INSERT INTO users (email, display_name) VALUES ('alice@test.com', 'Alice') RETURNING id",
    );
    const userId = userResult.rows[0].id;

    // Create two sessions with scores
    const s1 = await saveTournament('s1', 'AAAA', 'standard');
    await saveSessionPlayers(s1, [{ userId, playerName: 'Alice' }]);
    const scores1: PlayerScore[] = [{
      playerId: `user_${userId}`,
      playerName: 'Alice',
      rows: [{ cells: ['I', 'I', 'I', 'I'] }],
      plusClusters: 1,
      minusClusters: 0,
      netScore: 1,
    }];
    await saveScores(s1, scores1, new Map([['user_' + userId, userId]]));
    await endTournament(s1);

    const s2 = await saveTournament('s2', 'BBBB', 'standard');
    await saveSessionPlayers(s2, [{ userId, playerName: 'Alice' }]);
    const scores2: PlayerScore[] = [{
      playerId: `user_${userId}`,
      playerName: 'Alice',
      rows: [{ cells: ['I', 'I', 'X', 'X'] }],
      plusClusters: 0,
      minusClusters: 0,
      netScore: 0,
    }];
    await saveScores(s2, scores2, new Map([['user_' + userId, userId]]));
    await endTournament(s2);

    const leaderboard = await getLeaderboard();
    expect(leaderboard.length).toBeGreaterThanOrEqual(1);
    const aliceEntry = leaderboard.find((e) => e.playerName === 'Alice');
    expect(aliceEntry).toBeTruthy();
    expect(aliceEntry!.totalSessions).toBe(2);
    expect(aliceEntry!.totalPlusClusters).toBe(1);
    expect(aliceEntry!.netScore).toBe(1);
  });
});

describe('getTournamentHistory', () => {
  it('should return completed tournaments', async () => {
    const s1 = await saveTournament('s1', 'AAAA', 'standard');
    await saveSessionPlayers(s1, [{ userId: null, playerName: 'Alice' }]);
    await endTournament(s1);

    // Active session should not appear
    await saveTournament('s2', 'BBBB', 'standard');

    const history = await getTournamentHistory();
    expect(history).toHaveLength(1);
    expect(history[0].sessionCode).toBe('s1');
    expect(history[0].endedAt).toBeTruthy();
  });
});

describe('getPlayerStats', () => {
  it('should return individual player statistics', async () => {
    const pool = getTestPool();
    const userResult = await pool.query(
      "INSERT INTO users (email, display_name) VALUES ('bob@test.com', 'Bob') RETURNING id",
    );
    const userId = userResult.rows[0].id;

    const s1 = await saveTournament('s1', 'AAAA', 'standard');
    await saveSessionPlayers(s1, [{ userId, playerName: 'Bob' }]);
    const scores: PlayerScore[] = [{
      playerId: `user_${userId}`,
      playerName: 'Bob',
      rows: [{ cells: ['X', 'X', 'X', 'X'] }],
      plusClusters: 0,
      minusClusters: 1,
      netScore: -1,
    }];
    await saveScores(s1, scores, new Map([['user_' + userId, userId]]));
    await endTournament(s1);

    const stats = await getPlayerStats(userId);
    expect(stats).not.toBeNull();
    expect(stats!.displayName).toBe('Bob');
    expect(stats!.totalSessions).toBe(1);
    expect(stats!.totalMinusClusters).toBe(1);
    expect(stats!.netScore).toBe(-1);
    expect(stats!.recentSessions).toHaveLength(1);
  });

  it('should return null for non-existent user', async () => {
    const stats = await getPlayerStats(9999);
    expect(stats).toBeNull();
  });
});
