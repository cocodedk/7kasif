import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { createUser, sendMagicLink, verifyMagicToken, verifyToken } from '../../auth/auth.js';
import { getTestPool, initTestDb, cleanTestDb, closeTestDb } from './test-db.js';

// Override the auth module's pool to use the test pool
import { vi } from 'vitest';
vi.mock('../../auth/db.js', () => {
  return {
    getPool: () => getTestPool(),
  };
});

// Mock email sending
vi.mock('../../auth/email.js', () => {
  return {
    sendEmail: vi.fn().mockResolvedValue(undefined),
    buildMagicLinkEmail: vi.fn().mockReturnValue({ subject: 'test', html: '<p>test</p>' }),
  };
});

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-key-for-auth-tests';
  process.env.APP_URL = 'http://localhost:3000';
  await initTestDb();
});

beforeEach(async () => {
  await cleanTestDb();
});

afterAll(async () => {
  await closeTestDb();
});

describe('createUser', () => {
  it('should create a new user and return AuthUser', async () => {
    const user = await createUser('alice@test.com', 'Alice');

    expect(user.email).toBe('alice@test.com');
    expect(user.displayName).toBe('Alice');
    expect(user.role).toBe('player');
    expect(user.id).toBeGreaterThan(0);
  });

  it('should create an admin user when role is specified', async () => {
    const user = await createUser('admin@test.com', 'Admin', 'admin');
    expect(user.role).toBe('admin');
  });

  it('should reject duplicate email', async () => {
    await createUser('alice@test.com', 'Alice');
    await expect(createUser('alice@test.com', 'Alice2')).rejects.toThrow(
      'Email already registered',
    );
  });

  it('should be case-insensitive for emails', async () => {
    await createUser('Alice@Test.com', 'Alice');
    await expect(createUser('alice@test.com', 'Alice2')).rejects.toThrow(
      'Email already registered',
    );
  });

  it('should reject invalid email', async () => {
    await expect(createUser('notanemail', 'Alice')).rejects.toThrow(
      'A valid email is required',
    );
  });

  it('should reject empty email', async () => {
    await expect(createUser('', 'Alice')).rejects.toThrow(
      'A valid email is required',
    );
  });

  it('should reject empty display name', async () => {
    await expect(createUser('alice@test.com', '')).rejects.toThrow(
      'Display name is required',
    );
  });
});

describe('sendMagicLink', () => {
  it('should create a magic token for existing user', async () => {
    await createUser('alice@test.com', 'Alice');
    await sendMagicLink('alice@test.com');

    const pool = getTestPool();
    const result = await pool.query('SELECT * FROM magic_tokens');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].token).toHaveLength(64);
    expect(result.rows[0].used_at).toBeNull();
  });

  it('should silently succeed for unknown email', async () => {
    await sendMagicLink('unknown@test.com');

    const pool = getTestPool();
    const result = await pool.query('SELECT * FROM magic_tokens');
    expect(result.rows).toHaveLength(0);
  });
});

describe('verifyMagicToken', () => {
  it('should verify a valid token and return user + JWT', async () => {
    const user = await createUser('alice@test.com', 'Alice');
    await sendMagicLink('alice@test.com');

    const pool = getTestPool();
    const tokenResult = await pool.query('SELECT token FROM magic_tokens');
    const magicToken = tokenResult.rows[0].token;

    const result = await verifyMagicToken(magicToken);

    expect(result.user.email).toBe('alice@test.com');
    expect(result.user.displayName).toBe('Alice');
    expect(result.user.id).toBe(user.id);
    expect(result.token).toBeTruthy();

    // JWT should be verifiable
    const decoded = verifyToken(result.token);
    expect(decoded.userId).toBe(user.id);
    expect(decoded.email).toBe('alice@test.com');
    expect(decoded.role).toBe('player');
  });

  it('should reject an already-used token', async () => {
    await createUser('alice@test.com', 'Alice');
    await sendMagicLink('alice@test.com');

    const pool = getTestPool();
    const tokenResult = await pool.query('SELECT token FROM magic_tokens');
    const magicToken = tokenResult.rows[0].token;

    await verifyMagicToken(magicToken);
    await expect(verifyMagicToken(magicToken)).rejects.toThrow('Invalid, expired, or already-used token');
  });

  it('should reject an expired token', async () => {
    await createUser('alice@test.com', 'Alice');
    await sendMagicLink('alice@test.com');

    const pool = getTestPool();
    // Manually expire the token
    await pool.query("UPDATE magic_tokens SET expires_at = NOW() - INTERVAL '1 hour'");

    const tokenResult = await pool.query('SELECT token FROM magic_tokens');
    const magicToken = tokenResult.rows[0].token;

    await expect(verifyMagicToken(magicToken)).rejects.toThrow('Invalid, expired, or already-used token');
  });

  it('should reject an invalid token', async () => {
    await expect(verifyMagicToken('nonexistent-token')).rejects.toThrow('Invalid, expired, or already-used token');
  });

  it('should reject empty token', async () => {
    await expect(verifyMagicToken('')).rejects.toThrow('Token is required');
  });
});

describe('JWT verification', () => {
  it('should verify a valid token', async () => {
    const user = await createUser('alice@test.com', 'Alice');
    await sendMagicLink('alice@test.com');

    const pool = getTestPool();
    const tokenResult = await pool.query('SELECT token FROM magic_tokens');
    const { token } = await verifyMagicToken(tokenResult.rows[0].token);

    const decoded = verifyToken(token);
    expect(decoded.userId).toBe(user.id);
    expect(decoded.email).toBe('alice@test.com');
  });

  it('should reject an invalid token', () => {
    expect(() => verifyToken('invalid.token.here')).toThrow(
      'Invalid or expired token',
    );
  });

  it('should reject a token signed with a different secret', () => {
    const fakeToken = jwt.sign({ userId: 1, email: 'fake@test.com' }, 'wrong-secret');
    expect(() => verifyToken(fakeToken)).toThrow('Invalid or expired token');
  });

  it('should reject an expired token', () => {
    const expiredToken = jwt.sign(
      { userId: 1, email: 'alice@test.com' },
      process.env.JWT_SECRET!,
      { expiresIn: '0s' },
    );
    expect(() => verifyToken(expiredToken)).toThrow('Invalid or expired token');
  });
});
