import { getPool } from '../auth/db.js';
import { createUser } from '../auth/auth.js';

export async function ensureSchema(): Promise<void> {
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      display_name VARCHAR(50) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'player',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS magic_tokens (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(64) NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      session_code VARCHAR(36) NOT NULL UNIQUE,
      room_code VARCHAR(4) NOT NULL,
      mode VARCHAR(20) NOT NULL DEFAULT 'standard',
      started_at TIMESTAMPTZ DEFAULT NOW(),
      ended_at TIMESTAMPTZ,
      is_active BOOLEAN DEFAULT TRUE
    )`,
    `CREATE TABLE IF NOT EXISTS session_players (
      id SERIAL PRIMARY KEY,
      session_id INT REFERENCES sessions(id),
      user_id INT REFERENCES users(id),
      player_name VARCHAR(50) NOT NULL,
      final_plus_clusters INT DEFAULT 0,
      final_minus_clusters INT DEFAULT 0,
      final_net_score INT DEFAULT 0,
      score_rows JSONB DEFAULT '[]',
      UNIQUE (session_id, player_name)
    )`,
    `CREATE TABLE IF NOT EXISTS rounds (
      id SERIAL PRIMARY KEY,
      session_id INT REFERENCES sessions(id),
      round_number INT NOT NULL,
      cards_per_player INT NOT NULL,
      winner_name VARCHAR(50) NOT NULL,
      loser_name VARCHAR(50) NOT NULL,
      points INT NOT NULL,
      reversed BOOLEAN DEFAULT FALSE,
      finishing_card VARCHAR(10),
      played_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS round_actions (
      id SERIAL PRIMARY KEY,
      round_id INT REFERENCES rounds(id),
      turn_number INT NOT NULL,
      player_name VARCHAR(50) NOT NULL,
      action_type VARCHAR(30) NOT NULL,
      action_data JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    // Migrations: add columns that may be missing from older table versions
    `ALTER TABLE session_players ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id)`,
    `ALTER TABLE session_players ADD COLUMN IF NOT EXISTS score_rows JSONB DEFAULT '[]'`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_room_code ON sessions(room_code)`,
    `CREATE INDEX IF NOT EXISTS idx_session_players_session_id ON session_players(session_id)`,
    `CREATE INDEX IF NOT EXISTS idx_session_players_user_id ON session_players(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_rounds_session_id ON rounds(session_id)`,
    `CREATE INDEX IF NOT EXISTS idx_round_actions_round_id ON round_actions(round_id)`,
  ];

  const pool = getPool();
  for (const sql of statements) {
    try {
      await pool.query(sql);
    } catch (err: any) {
      console.error(`Schema statement failed: ${err.message}\n  SQL: ${sql.slice(0, 60)}...`);
    }
  }
  console.log('Database schema verified');
}

export async function seedAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAIL;
  const name = process.env.ADMIN_NAME || 'Admin';
  if (!email) return;

  try {
    const pool = getPool();
    const existing = await pool.query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['admin']);
    if (existing.rows.length > 0) return;

    const user = await createUser(email, name, 'admin');
    console.log(`Admin seeded: ${user.email} (id: ${user.id})`);
  } catch (err: any) {
    console.error(`Admin seed failed: ${err.message}`);
  }
}
