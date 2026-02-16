import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { getPool } from './db.js';
import { sendEmail, buildMagicLinkEmail } from './email.js';

const MAGIC_TOKEN_EXPIRY_MINUTES = 15;

export type Role = 'admin' | 'player';

export interface AuthUser {
  id: number;
  email: string;
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

function getAppUrl(): string {
  return process.env.APP_URL || 'http://localhost:3000';
}

export async function createUser(
  email: string,
  displayName: string,
  role: Role = 'player',
): Promise<AuthUser> {
  if (!email || !email.includes('@')) {
    throw new Error('A valid email is required');
  }
  if (!displayName || displayName.trim().length === 0) {
    throw new Error('Display name is required');
  }

  const pool = getPool();

  try {
    const result = await pool.query(
      'INSERT INTO users (email, display_name, role) VALUES ($1, $2, $3) RETURNING id, email, display_name, role',
      [email.toLowerCase().trim(), displayName.trim(), role],
    );

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      role: row.role,
    };
  } catch (err: any) {
    if (err.code === '23505') {
      throw new Error('Email already registered');
    }
    throw err;
  }
}

export async function sendMagicLink(email: string, isInvite: boolean = false): Promise<void> {
  if (!email) return;

  const pool = getPool();
  const normalizedEmail = email.toLowerCase().trim();

  const userResult = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [normalizedEmail],
  );

  // Silent success for unknown emails (prevents email enumeration)
  if (userResult.rows.length === 0) return;

  const userId = userResult.rows[0].id;
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + MAGIC_TOKEN_EXPIRY_MINUTES * 60 * 1000);

  await pool.query(
    'INSERT INTO magic_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [userId, token, expiresAt],
  );

  const url = `${getAppUrl()}/auth/verify?token=${token}`;
  const { subject, html } = buildMagicLinkEmail(url, isInvite);

  await sendEmail({ to: normalizedEmail, subject, html });
}

export async function verifyMagicToken(token: string): Promise<AuthResult> {
  if (!token) throw new Error('Token is required');
  const pool = getPool();

  const result = await pool.query(
    `UPDATE magic_tokens SET used_at = NOW()
     WHERE token = $1 AND used_at IS NULL AND expires_at > NOW()
     RETURNING user_id`,
    [token],
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid, expired, or already-used token');
  }

  const userId = result.rows[0].user_id;
  const userResult = await pool.query(
    'SELECT id, email, display_name, role FROM users WHERE id = $1',
    [userId],
  );
  const row = userResult.rows[0];
  const user: AuthUser = { id: row.id, email: row.email, displayName: row.display_name, role: row.role };

  const jwtToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    getJwtSecret(),
    { expiresIn: '7d' },
  );
  return { user, token: jwtToken };
}

export function verifyToken(token: string): { userId: number; email: string; role: Role } {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as {
      userId: number;
      email: string;
      role: Role;
    };
    return { userId: decoded.userId, email: decoded.email, role: decoded.role };
  } catch {
    throw new Error('Invalid or expired token');
  }
}
