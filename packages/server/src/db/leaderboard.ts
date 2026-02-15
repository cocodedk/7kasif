import { getPool } from '../auth/db.js';

export interface LeaderboardEntry {
  userId: number | null;
  playerName: string;
  displayName: string | null;
  totalSessions: number;
  totalRoundsWon: number;
  totalRoundsLost: number;
  totalPlusClusters: number;
  totalMinusClusters: number;
  netScore: number;
}

export interface TournamentSummary {
  id: number;
  sessionCode: string;
  roomCode: string;
  mode: string;
  startedAt: string;
  endedAt: string | null;
  playerCount: number;
  roundCount: number;
}

export interface PlayerStats {
  userId: number;
  email: string;
  displayName: string;
  totalSessions: number;
  totalRoundsWon: number;
  totalRoundsLost: number;
  totalPlusClusters: number;
  totalMinusClusters: number;
  netScore: number;
  recentSessions: TournamentSummary[];
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const pool = getPool();
  const result = await pool.query(`
    SELECT
      sp.user_id,
      sp.player_name,
      u.display_name,
      COUNT(DISTINCT sp.session_id) AS total_sessions,
      COALESCE(SUM(sp.final_plus_clusters), 0) AS total_plus_clusters,
      COALESCE(SUM(sp.final_minus_clusters), 0) AS total_minus_clusters,
      COALESCE(SUM(sp.final_net_score), 0) AS net_score,
      COALESCE(wins.cnt, 0) AS total_rounds_won,
      COALESCE(losses.cnt, 0) AS total_rounds_lost
    FROM session_players sp
    LEFT JOIN users u ON u.id = sp.user_id
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS cnt FROM rounds r
      WHERE r.session_id = sp.session_id AND r.winner_name = sp.player_name AND NOT r.reversed
    ) wins ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS cnt FROM rounds r
      WHERE r.session_id = sp.session_id AND r.loser_name = sp.player_name AND NOT r.reversed
    ) losses ON true
    GROUP BY sp.user_id, sp.player_name, u.display_name, wins.cnt, losses.cnt
    ORDER BY net_score DESC, total_plus_clusters DESC
  `);

  return result.rows.map((row) => ({
    userId: row.user_id,
    playerName: row.player_name,
    displayName: row.display_name,
    totalSessions: parseInt(row.total_sessions, 10),
    totalRoundsWon: parseInt(row.total_rounds_won, 10),
    totalRoundsLost: parseInt(row.total_rounds_lost, 10),
    totalPlusClusters: parseInt(row.total_plus_clusters, 10),
    totalMinusClusters: parseInt(row.total_minus_clusters, 10),
    netScore: parseInt(row.net_score, 10),
  }));
}

export async function getTournamentHistory(): Promise<TournamentSummary[]> {
  const pool = getPool();
  const result = await pool.query(`
    SELECT
      s.id,
      s.session_code,
      s.room_code,
      s.mode,
      s.started_at,
      s.ended_at,
      (SELECT COUNT(*) FROM session_players sp WHERE sp.session_id = s.id) AS player_count,
      (SELECT COUNT(*) FROM rounds r WHERE r.session_id = s.id) AS round_count
    FROM sessions s
    WHERE s.ended_at IS NOT NULL
    ORDER BY s.ended_at DESC
    LIMIT 50
  `);

  return result.rows.map((row) => ({
    id: row.id,
    sessionCode: row.session_code,
    roomCode: row.room_code,
    mode: row.mode,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    playerCount: parseInt(row.player_count, 10),
    roundCount: parseInt(row.round_count, 10),
  }));
}

export async function getPlayerStats(userId: number): Promise<PlayerStats | null> {
  const pool = getPool();

  const userResult = await pool.query(
    'SELECT id, email, display_name FROM users WHERE id = $1',
    [userId],
  );
  if (userResult.rows.length === 0) return null;

  const user = userResult.rows[0];

  const statsResult = await pool.query(`
    SELECT
      COUNT(DISTINCT sp.session_id) AS total_sessions,
      COALESCE(SUM(sp.final_plus_clusters), 0) AS total_plus_clusters,
      COALESCE(SUM(sp.final_minus_clusters), 0) AS total_minus_clusters,
      COALESCE(SUM(sp.final_net_score), 0) AS net_score
    FROM session_players sp
    WHERE sp.user_id = $1
  `, [userId]);

  const stats = statsResult.rows[0];

  const winsResult = await pool.query(`
    SELECT COUNT(*) AS cnt FROM rounds r
    JOIN session_players sp ON sp.session_id = r.session_id AND sp.player_name = r.winner_name
    WHERE sp.user_id = $1 AND NOT r.reversed
  `, [userId]);

  const lossesResult = await pool.query(`
    SELECT COUNT(*) AS cnt FROM rounds r
    JOIN session_players sp ON sp.session_id = r.session_id AND sp.player_name = r.loser_name
    WHERE sp.user_id = $1 AND NOT r.reversed
  `, [userId]);

  const sessionsResult = await pool.query(`
    SELECT DISTINCT s.id, s.session_code, s.room_code, s.mode, s.started_at, s.ended_at,
      (SELECT COUNT(*) FROM session_players sp2 WHERE sp2.session_id = s.id) AS player_count,
      (SELECT COUNT(*) FROM rounds r WHERE r.session_id = s.id) AS round_count
    FROM sessions s
    JOIN session_players sp ON sp.session_id = s.id
    WHERE sp.user_id = $1
    ORDER BY s.started_at DESC
    LIMIT 10
  `, [userId]);

  return {
    userId: user.id,
    email: user.email,
    displayName: user.display_name,
    totalSessions: parseInt(stats.total_sessions, 10),
    totalRoundsWon: parseInt(winsResult.rows[0].cnt, 10),
    totalRoundsLost: parseInt(lossesResult.rows[0].cnt, 10),
    totalPlusClusters: parseInt(stats.total_plus_clusters, 10),
    totalMinusClusters: parseInt(stats.total_minus_clusters, 10),
    netScore: parseInt(stats.net_score, 10),
    recentSessions: sessionsResult.rows.map((row) => ({
      id: row.id,
      sessionCode: row.session_code,
      roomCode: row.room_code,
      mode: row.mode,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      playerCount: parseInt(row.player_count, 10),
      roundCount: parseInt(row.round_count, 10),
    })),
  };
}
