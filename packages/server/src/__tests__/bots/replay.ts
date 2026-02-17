/**
 * Deterministic engine replay of a bot game log file.
 *
 * Reads a JSONL log with an INIT entry (containing the full deck) and
 * replays every ACTION through the engine, verifying correctness.
 *
 * Usage: npx tsx packages/server/src/__tests__/bots/replay.ts <logfile.jsonl>
 */
import { readFileSync } from 'fs';
import type { LogEntry } from './game-logger.js';
import { createInitialState, applyAction } from '../../engine/game.js';
import type { GameState } from '@hafte-kasif/shared';

const logPath = process.argv[2];
if (!logPath) {
  console.error('Usage: npx tsx replay.ts <logfile.jsonl>');
  process.exit(1);
}

const lines = readFileSync(logPath, 'utf-8').trim().split('\n');
const entries: LogEntry[] = lines.map(line => JSON.parse(line));

// Find INIT entry
const initEntry = entries.find(e => e.type === 'INIT');
if (!initEntry || initEntry.type !== 'INIT') {
  console.error('No INIT entry found in log. Cannot replay without deck data.');
  console.error('Re-run bots with DEBUG_GAME_LOG=1 to capture deck order.');
  process.exit(1);
}

console.log(`Deck: ${initEntry.deck.length} cards`);
console.log(`Players: ${initEntry.players.map(p => p.name).join(', ')}`);
console.log(`Dealer: ${initEntry.dealerId}`);
console.log(`Cards per player: ${initEntry.cardsPerPlayer}`);
console.log(`Mode: ${initEntry.mode}`);
console.log('---');

// Reconstruct initial state using the captured deck
const deck = initEntry.deck;
let state: GameState = createInitialState(
  initEntry.players,
  initEntry.dealerId,
  initEntry.cardsPerPlayer,
  initEntry.mode,
  () => deck, // identity shuffle — deck is already in the captured order
);

// Replay all actions
const actionEntries = entries.filter(e => e.type === 'ACTION');
let actionNum = 0;
let failures = 0;

for (const entry of actionEntries) {
  if (entry.type !== 'ACTION') continue;
  actionNum++;

  const result = applyAction(state, entry.playerId, entry.action);

  if (result.ok) {
    state = result.newState;
    const detail = entry.action.type === 'PLAY_CARD'
      ? ` ${entry.action.card.value} of ${entry.action.card.suit}`
      : entry.action.type === 'REVEAL_CARD'
        ? ` ${entry.action.card.value} of ${entry.action.card.suit}`
        : '';
    console.log(`#${actionNum} \x1b[32mOK\x1b[0m [${entry.bot}] ${entry.action.type}${detail}`);

    // Print game over events
    const gameOver = result.events.find(e => e.type === 'GAME_OVER');
    if (gameOver && gameOver.type === 'GAME_OVER') {
      console.log(`\n\x1b[33mGAME OVER\x1b[0m winner=${gameOver.winnerId} loser=${gameOver.loserId} points=${gameOver.points} reversed=${gameOver.reversed}`);
    }
  } else {
    failures++;
    const detail = entry.action.type === 'PLAY_CARD'
      ? ` ${entry.action.card.value} of ${entry.action.card.suit}`
      : '';
    console.log(`#${actionNum} \x1b[31mFAIL\x1b[0m [${entry.bot}] ${entry.action.type}${detail} — ${result.reason}`);
  }
}

console.log('\n---');
console.log(`Replayed ${actionNum} actions: ${actionNum - failures} ok, ${failures} failed`);
console.log(`Final phase: ${state.phase}`);
if (state.winner) {
  const winner = state.players.find(p => p.id === state.winner);
  console.log(`Winner: ${winner?.name ?? state.winner}`);
}
if (failures === 0) {
  console.log('\x1b[32mReplay successful — all actions matched.\x1b[0m');
} else {
  console.log(`\x1b[31m${failures} action(s) failed during replay.\x1b[0m`);
  process.exit(1);
}
