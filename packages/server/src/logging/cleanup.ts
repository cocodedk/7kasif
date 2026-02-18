import { readdirSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';

export function cleanupOldLogs(logsDir: string, maxAgeDays = 30): void {
  let entries: string[];
  try {
    entries = readdirSync(logsDir);
  } catch {
    return; // directory doesn't exist yet
  }

  const now = Date.now();
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

  for (const entry of entries) {
    if (!entry.endsWith('.jsonl')) continue;
    const filePath = join(logsDir, entry);
    try {
      const stat = statSync(filePath);
      if (now - stat.mtimeMs > maxAgeMs) {
        unlinkSync(filePath);
      }
    } catch {
      // ignore individual file errors
    }
  }
}
