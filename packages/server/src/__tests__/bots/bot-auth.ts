import jwt from 'jsonwebtoken';
import { createUser } from '../../auth/auth.js';
import type { Role } from '../../auth/auth.js';

export interface BotCredentials {
  userId: number;
  displayName: string;
  token: string;
}

const BOT_NAMES = ['Alice', 'Bob', 'Charlie', 'Diana'];

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is required');
  return secret;
}

export async function createBotCredentials(count: number = BOT_NAMES.length): Promise<BotCredentials[]> {
  const credentials: BotCredentials[] = [];

  for (const name of BOT_NAMES.slice(0, count)) {
    const email = `bot-${name.toLowerCase()}@7kasif.test`;
    const displayName = name;

    let user;
    try {
      user = await createUser(email, displayName, 'player' as Role);
    } catch (err: any) {
      if (err.message === 'Email already registered') {
        // Bot user already exists — look up their ID
        const { getPool } = await import('../../auth/db.js');
        const pool = getPool();
        const result = await pool.query(
          'SELECT id, email, display_name FROM users WHERE email = $1',
          [email],
        );
        user = {
          id: result.rows[0].id,
          email: result.rows[0].email,
          displayName: result.rows[0].display_name,
        };
      } else {
        throw err;
      }
    }

    const token = jwt.sign(
      { userId: user.id, email: email, role: 'player' },
      getJwtSecret(),
      { expiresIn: '1d' },
    );

    credentials.push({ userId: user.id, displayName, token });
  }

  return credentials;
}
