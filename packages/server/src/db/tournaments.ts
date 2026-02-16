import { getPool } from '../auth/db.js';
import type { PlayerScore, RoundResult, TournamentView } from '@hafte-kasif/shared';

export interface DbSession {
  id: number;
  sessionCode: string;
  roomCode: string;
  mode: string;
  startedAt: string;
  endedAt: string | null;
  isActive: boolean;
}

export async function saveTournament(
  sessionCode: string,
  roomCode: string,
  mode: string,
): Promise<number> {
  const pool = getPool();
  const result = await pool.query(
    'INSERT INTO sessions (session_code, room_code, mode) VALUES ($1, $2, $3) RETURNING id',
    [sessionCode, roomCode, mode],
  );
  return result.rows[0].id;
}

export async function saveSessionPlayers(
  sessionId: number,
  players: { userId: number | null; playerName: string }[],
): Promise<void> {
  const pool = getPool();
  for (const player of players) {
    await pool.query(
      'INSERT INTO session_players (session_id, user_id, player_name) VALUES ($1, $2, $3)',
      [sessionId, player.userId, player.playerName],
    );
  }
}

export async function saveRound(
  sessionId: number,
  roundNumber: number,
  cardsPerPlayer: number,
  winnerName: string,
  loserName: string,
  points: number,
  reversed: boolean,
  finishingCard: string,
): Promise<number> {
  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO rounds (session_id, round_number, cards_per_player, winner_name, loser_name, points, reversed, finishing_card)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [sessionId, roundNumber, cardsPerPlayer, winnerName, loserName, points, reversed, finishingCard],
  );
  return result.rows[0].id;
}

export async function saveScores(
  sessionId: number,
  playerScores: PlayerScore[],
  userIdMap: Map<string, number | null>,
): Promise<void> {
  const pool = getPool();
  for (const score of playerScores) {
    const userId = userIdMap.get(score.playerId) ?? null;
    await pool.query(
      `UPDATE session_players
       SET final_plus_clusters = $1, final_minus_clusters = $2, final_net_score = $3, score_rows = $4, user_id = $5
       WHERE session_id = $6 AND player_name = $7`,
      [
        score.plusClusters,
        score.minusClusters,
        score.netScore,
        JSON.stringify(score.rows),
        userId,
        sessionId,
        score.playerName,
      ],
    );
  }
}

export async function endTournament(sessionId: number): Promise<void> {
  const pool = getPool();
  await pool.query(
    'UPDATE sessions SET ended_at = NOW(), is_active = false WHERE id = $1',
    [sessionId],
  );
}

export async function loadTournament(sessionId: number): Promise<TournamentView | null> {
  const pool = getPool();
  const sessionResult = await pool.query(
    'SELECT * FROM sessions WHERE id = $1',
    [sessionId],
  );
  if (sessionResult.rows.length === 0) return null;

  const session = sessionResult.rows[0];

  const playersResult = await pool.query(
    'SELECT * FROM session_players WHERE session_id = $1',
    [sessionId],
  );

  const roundsResult = await pool.query(
    'SELECT * FROM rounds WHERE session_id = $1 ORDER BY round_number',
    [sessionId],
  );

  const playerScores: PlayerScore[] = playersResult.rows.map((row) => ({
    playerId: row.user_id ? `user_${row.user_id}` : row.player_name,
    playerName: row.player_name,
    rows: row.score_rows || [],
    plusClusters: row.final_plus_clusters,
    minusClusters: row.final_minus_clusters,
    netScore: row.final_net_score,
  }));

  const rounds: RoundResult[] = roundsResult.rows.map((row) => ({
    roundNumber: row.round_number,
    winnerId: row.winner_name,
    loserId: row.loser_name,
    points: row.points,
    reversed: row.reversed,
    finishingCardValue: row.finishing_card || '',
    timestamp: row.played_at,
  }));

  return {
    sessionId: session.session_code,
    createdAt: session.started_at,
    playerScores,
    rounds,
    currentRound: rounds.length + 1,
  };
}
