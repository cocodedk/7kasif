#!/usr/bin/env tsx
/**
 * Seed an admin user directly in the database.
 * Usage: npx tsx packages/server/src/auth/seed-admin.ts <username> <password> <displayName>
 */
import { register } from './auth.js';
import { closePool } from './db.js';

async function main() {
  const [username, password, displayName] = process.argv.slice(2);

  if (!username || !password || !displayName) {
    console.error('Usage: npx tsx seed-admin.ts <username> <password> <displayName>');
    process.exit(1);
  }

  try {
    const result = await register(username, password, displayName, 'admin');
    console.log(`Admin user created: ${result.user.username} (id: ${result.user.id}, role: ${result.user.role})`);
  } catch (err: any) {
    console.error(`Failed to create admin: ${err.message}`);
    process.exit(1);
  } finally {
    await closePool();
  }
}

main();
