import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getPool } from './db.js';

const BCRYPT_ROUNDS = 10;

export type Role = 'admin' | 'player';

export interface AuthUser {
  id: number;
  username: string;
  displayName: string;
  role: Role;
}

export interface AuthResult {
  user: AuthUser;
  token: string;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is required');
  return secret;
}

export async function register(
  username: string,
  password: string,
  displayName: string,
  role: Role = 'player',
): Promise<AuthResult> {
  if (!username || username.length < 3) {
    throw new Error('Username must be at least 3 characters');
  }
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }
  if (!displayName || displayName.trim().length === 0) {
    throw new Error('Display name is required');
  }

  const pool = getPool();
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  try {
    const result = await pool.query(
      'INSERT INTO users (username, password_hash, display_name, role) VALUES ($1, $2, $3, $4) RETURNING id, username, display_name, role',
      [username.toLowerCase(), passwordHash, displayName.trim(), role],
    );

    const row = result.rows[0];
    const user: AuthUser = {
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      role: row.role,
    };

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      getJwtSecret(),
      { expiresIn: '7d' },
    );

    return { user, token };
  } catch (err: any) {
    if (err.code === '23505') {
      throw new Error('Username already taken');
    }
    throw err;
  }
}

export async function login(
  username: string,
  password: string,
): Promise<AuthResult> {
  if (!username || !password) {
    throw new Error('Username and password are required');
  }

  const pool = getPool();
  const result = await pool.query(
    'SELECT id, username, password_hash, display_name, role FROM users WHERE username = $1',
    [username.toLowerCase()],
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid username or password');
  }

  const row = result.rows[0];
  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) {
    throw new Error('Invalid username or password');
  }

  const user: AuthUser = {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
  };

  const token = jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    getJwtSecret(),
    { expiresIn: '7d' },
  );

  return { user, token };
}

export function verifyToken(token: string): { userId: number; username: string; role: Role } {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as {
      userId: number;
      username: string;
      role: Role;
    };
    return { userId: decoded.userId, username: decoded.username, role: decoded.role };
  } catch {
    throw new Error('Invalid or expired token');
  }
}
