import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { register, login, verifyToken } from '../../auth/auth.js';
import { getTestPool, initTestDb, cleanTestDb, closeTestDb } from './test-db.js';
import bcrypt from 'bcrypt';

// Override the auth module's pool to use the test pool
import { vi } from 'vitest';
vi.mock('../../auth/db.js', () => {
  return {
    getPool: () => getTestPool(),
  };
});

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-key-for-auth-tests';
  await initTestDb();
});

beforeEach(async () => {
  await cleanTestDb();
});

afterAll(async () => {
  await closeTestDb();
});

describe('register', () => {
  it('should register a new user and return user + JWT', async () => {
    const result = await register('alice', 'password123', 'Alice');

    expect(result.user.username).toBe('alice');
    expect(result.user.displayName).toBe('Alice');
    expect(result.user.role).toBe('player');
    expect(result.user.id).toBeGreaterThan(0);
    expect(result.token).toBeTruthy();

    // Token should be verifiable
    const decoded = verifyToken(result.token);
    expect(decoded.userId).toBe(result.user.id);
    expect(decoded.username).toBe('alice');
    expect(decoded.role).toBe('player');
  });

  it('should register an admin user when role is specified', async () => {
    const result = await register('admin1', 'password123', 'Admin', 'admin');

    expect(result.user.role).toBe('admin');
    const decoded = verifyToken(result.token);
    expect(decoded.role).toBe('admin');
  });

  it('should reject duplicate username', async () => {
    await register('alice', 'password123', 'Alice');
    await expect(register('alice', 'differentpass', 'Alice2')).rejects.toThrow(
      'Username already taken',
    );
  });

  it('should be case-insensitive for usernames', async () => {
    await register('Alice', 'password123', 'Alice');
    await expect(register('alice', 'differentpass', 'Alice2')).rejects.toThrow(
      'Username already taken',
    );
  });

  it('should reject empty username', async () => {
    await expect(register('', 'password123', 'Alice')).rejects.toThrow(
      'Username must be at least 3 characters',
    );
  });

  it('should reject short username', async () => {
    await expect(register('ab', 'password123', 'Alice')).rejects.toThrow(
      'Username must be at least 3 characters',
    );
  });

  it('should reject short password', async () => {
    await expect(register('alice', '12345', 'Alice')).rejects.toThrow(
      'Password must be at least 6 characters',
    );
  });

  it('should reject empty password', async () => {
    await expect(register('alice', '', 'Alice')).rejects.toThrow(
      'Password must be at least 6 characters',
    );
  });

  it('should reject empty display name', async () => {
    await expect(register('alice', 'password123', '')).rejects.toThrow(
      'Display name is required',
    );
  });
});

describe('password hashing', () => {
  it('should store password as bcrypt hash, never plain text', async () => {
    await register('alice', 'password123', 'Alice');

    const pool = getTestPool();
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE username = $1',
      ['alice'],
    );

    const hash = result.rows[0].password_hash;
    expect(hash).not.toBe('password123');
    expect(hash.startsWith('$2b$')).toBe(true);

    // Hash should validate with bcrypt
    const isValid = await bcrypt.compare('password123', hash);
    expect(isValid).toBe(true);
  });
});

describe('login', () => {
  beforeEach(async () => {
    await register('alice', 'password123', 'Alice');
  });

  it('should login with correct credentials and return JWT', async () => {
    const result = await login('alice', 'password123');

    expect(result.user.username).toBe('alice');
    expect(result.user.displayName).toBe('Alice');
    expect(result.user.role).toBe('player');
    expect(result.token).toBeTruthy();

    const decoded = verifyToken(result.token);
    expect(decoded.userId).toBe(result.user.id);
    expect(decoded.role).toBe('player');
  });

  it('should login case-insensitively', async () => {
    const result = await login('Alice', 'password123');
    expect(result.user.username).toBe('alice');
  });

  it('should reject wrong password', async () => {
    await expect(login('alice', 'wrongpassword')).rejects.toThrow(
      'Invalid username or password',
    );
  });

  it('should reject non-existent user', async () => {
    await expect(login('nonexistent', 'password123')).rejects.toThrow(
      'Invalid username or password',
    );
  });

  it('should reject empty credentials', async () => {
    await expect(login('', 'password123')).rejects.toThrow(
      'Username and password are required',
    );
    await expect(login('alice', '')).rejects.toThrow(
      'Username and password are required',
    );
  });
});

describe('JWT verification', () => {
  it('should verify a valid token', async () => {
    const { token, user } = await register('alice', 'password123', 'Alice');
    const decoded = verifyToken(token);

    expect(decoded.userId).toBe(user.id);
    expect(decoded.username).toBe('alice');
  });

  it('should reject an invalid token', () => {
    expect(() => verifyToken('invalid.token.here')).toThrow(
      'Invalid or expired token',
    );
  });

  it('should reject a token signed with a different secret', () => {
    const jwt = require('jsonwebtoken');
    const fakeToken = jwt.sign({ userId: 1, username: 'fake' }, 'wrong-secret');
    expect(() => verifyToken(fakeToken)).toThrow('Invalid or expired token');
  });

  it('should reject an expired token', () => {
    const jwt = require('jsonwebtoken');
    const expiredToken = jwt.sign(
      { userId: 1, username: 'alice' },
      process.env.JWT_SECRET!,
      { expiresIn: '0s' },
    );
    expect(() => verifyToken(expiredToken)).toThrow('Invalid or expired token');
  });
});
