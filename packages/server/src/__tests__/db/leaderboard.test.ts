import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import { getTestPool, initTestDb, cleanTestDb, closeTestDb } from '../auth/test-db.js';

vi.mock('../../auth/db.js', () => {
  return {
    getPool: () => getTestPool(),
  };
});

import { getLeaderboard, getTournamentHistory, getPlayerStats } from '../../db/leaderboard.js';
import { saveTournament, saveSessionPlayers, saveRound, saveScores, endTournament } from '../../db/tournaments.js';
import { createUser } from '../../auth/auth.js';

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-lb';
  process.env.APP_URL = 'http://localhost:3000';
  await initTestDb();
});

beforeEach(async () => {
  await cleanTestDb();
});

afterAll(async () => {
  await closeTestDb();
});

describe('Leaderboard DB functions', () => {
  it('getLeaderboard should return empty array when no data', async () => {
    const result = await getLeaderboard();
    expect(result).toEqual([]);
  });

  it('getLeaderboard should return player stats after a session', async () => {
    const user1 = await createUser('alice@test.com', 'Alice');
    const user2 = await createUser('bob@test.com', 'Bob');

    const sessionId = await saveTournament('session-123', 'ABCD', 'standard');

    await saveSessionPlayers(sessionId, [
      { userId: user1.id, playerName: 'Alice' },
      { userId: user2.id, playerName: 'Bob' },
    ]);

    await saveRound(sessionId, 1, 7, 'Alice', 'Bob', 10, false, '7H');
    await saveRound(sessionId, 2, 6, 'Bob', 'Alice', 8, false, '6D');

    const userIdMap = new Map<string, number | null>([
      [`user_${user1.id}`, user1.id],
      [`user_${user2.id}`, user2.id],
    ]);

    await saveScores(sessionId, [
      { playerId: `user_${user1.id}`, playerName: 'Alice', rows: [], plusClusters: 2, minusClusters: 1, netScore: 1 },
      { playerId: `user_${user2.id}`, playerName: 'Bob', rows: [], plusClusters: 1, minusClusters: 2, netScore: -1 },
    ], userIdMap);

    await endTournament(sessionId);

    const leaderboard = await getLeaderboard();

    expect(leaderboard).toHaveLength(2);
    expect(leaderboard[0]).toMatchObject({
      userId: user1.id,
      playerName: 'Alice',
      displayName: 'Alice',
      totalSessions: 1,
      totalRoundsWon: 1,
      totalRoundsLost: 1,
      totalPlusClusters: 2,
      totalMinusClusters: 1,
      netScore: 1,
    });
    expect(leaderboard[1]).toMatchObject({
      userId: user2.id,
      playerName: 'Bob',
      displayName: 'Bob',
      totalSessions: 1,
      totalRoundsWon: 1,
      totalRoundsLost: 1,
      totalPlusClusters: 1,
      totalMinusClusters: 2,
      netScore: -1,
    });
  });

  it('getTournamentHistory should return ended sessions', async () => {
    const user1 = await createUser('charlie@test.com', 'Charlie');
    const user2 = await createUser('diana@test.com', 'Diana');

    const sessionId = await saveTournament('session-456', 'WXYZ', 'standard');

    await saveSessionPlayers(sessionId, [
      { userId: user1.id, playerName: 'Charlie' },
      { userId: user2.id, playerName: 'Diana' },
    ]);

    await saveRound(sessionId, 1, 7, 'Charlie', 'Diana', 10, false, '7C');

    const userIdMap = new Map<string, number | null>([
      [`user_${user1.id}`, user1.id],
      [`user_${user2.id}`, user2.id],
    ]);

    await saveScores(sessionId, [
      { playerId: `user_${user1.id}`, playerName: 'Charlie', rows: [], plusClusters: 1, minusClusters: 0, netScore: 1 },
      { playerId: `user_${user2.id}`, playerName: 'Diana', rows: [], plusClusters: 0, minusClusters: 1, netScore: -1 },
    ], userIdMap);

    await endTournament(sessionId);

    const history = await getTournamentHistory();

    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      sessionCode: 'session-456',
      roomCode: 'WXYZ',
      mode: 'standard',
      playerCount: 2,
      roundCount: 1,
    });
    expect(history[0].endedAt).not.toBeNull();
  });

  it('getPlayerStats should return null for unknown user', async () => {
    const result = await getPlayerStats(99999);
    expect(result).toBeNull();
  });
});
