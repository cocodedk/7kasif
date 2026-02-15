#!/usr/bin/env tsx
/**
 * Seed an admin user directly in the database.
 * Usage: npx tsx packages/server/src/auth/seed-admin.ts <email> <displayName>
 */
import { createUser } from './auth.js';
import { closePool } from './db.js';

async function main() {
  const [email, displayName] = process.argv.slice(2);

  if (!email || !displayName) {
    console.error('Usage: npx tsx seed-admin.ts <email> <displayName>');
    process.exit(1);
  }

  try {
    const user = await createUser(email, displayName, 'admin');
    console.log(`Admin user created: ${user.email} (id: ${user.id}, role: ${user.role})`);
  } catch (err: any) {
    console.error(`Failed to create admin: ${err.message}`);
    process.exit(1);
  } finally {
    await closePool();
  }
}

main();
