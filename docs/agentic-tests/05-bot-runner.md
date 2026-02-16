# Step 5: Bot Runner - Orchestrator for Autonomous Players

## Problem
We need an orchestrator that wires together auth, client, and brain to create 3 functional bot players that join a room and play autonomously.

## Approach
A `BotRunner` class that manages the lifecycle of all 3 bots:
1. Creates bot users & tokens (bot-auth)
2. Connects each bot via WebSocket (bot-client)
3. Joins them to a room code
4. Listens for game state and auto-plays when it's each bot's turn (bot-brain)
5. Logs all actions for debugging

## Implementation Details

```typescript
// bot-runner.ts
import { BotClient } from './bot-client.js';
import { createBotCredentials, type BotCredentials } from './bot-auth.js';
import { decideAction } from './bot-brain.js';
import type { PlayerView, ServerMessage } from '@7kasif/shared';

interface BotInstance {
  credentials: BotCredentials;
  client: BotClient;
  playerId: string;
  hasDrawnThisTurn: boolean;
}

export class BotRunner {
  private bots: BotInstance[] = [];
  private serverUrl: string;

  constructor(serverUrl: string = 'ws://localhost:3000/ws') {
    this.serverUrl = serverUrl;
  }

  async start(roomCode: string): Promise<void> {
    // Step 1: Create bot credentials
    console.log('Creating bot credentials...');
    const credentials = await createBotCredentials();

    // Step 2: Connect each bot
    for (const cred of credentials) {
      const client = new BotClient(cred.displayName);
      await client.connect(this.serverUrl);

      const bot: BotInstance = {
        credentials: cred,
        client,
        playerId: '', // set after join
        hasDrawnThisTurn: false,
      };

      // Step 3: Join the room
      client.send({
        type: 'JOIN_ROOM',
        roomCode,
        playerName: cred.displayName,
        token: cred.token,
      });

      const joined = await client.waitFor('ROOM_JOINED');
      bot.playerId = joined.playerId;
      console.log(`[${cred.displayName}] Joined room ${roomCode} as ${bot.playerId}`);

      // Step 4: Set up game state listener
      this.setupGameLoop(bot);
      this.bots.push(bot);
    }

    console.log('All bots joined. Waiting for game to start...');
  }

  private setupGameLoop(bot: BotInstance): void {
    let lastCurrentPlayer = '';

    bot.client.onMessage((msg: ServerMessage) => {
      if (msg.type === 'GAME_STATE') {
        const view: PlayerView = msg.state;

        // Reset draw tracking when turn changes
        if (view.currentPlayerId !== lastCurrentPlayer) {
          bot.hasDrawnThisTurn = false;
          lastCurrentPlayer = view.currentPlayerId;
        }

        // Not my turn? Do nothing
        if (view.currentPlayerId !== bot.playerId) return;
        if (view.phase !== 'playing') return;

        // Small delay to feel natural (300-800ms)
        const delay = 300 + Math.random() * 500;
        setTimeout(() => {
          // Announce one card if needed
          if (view.myHand.length === 1) {
            console.log(`[${bot.credentials.displayName}] Announcing one card!`);
            bot.client.send({ type: 'PLAYER_ACTION', action: { type: 'ANNOUNCE_ONE_CARD' } });
            return;
          }

          const action = decideAction(view, bot.playerId, bot.hasDrawnThisTurn);
          if (!action) return;

          if (action.type === 'DRAW_CARD') {
            bot.hasDrawnThisTurn = true;
          }

          console.log(`[${bot.credentials.displayName}] Action: ${action.type}`,
            action.type === 'PLAY_CARD' ? `${action.card.value} of ${action.card.suit}` : '');

          bot.client.send({ type: 'PLAYER_ACTION', action });
        }, delay);
      }

      if (msg.type === 'MOVE_REJECTED') {
        console.error(`[${bot.credentials.displayName}] Move rejected: ${msg.reason}`);
        // If move was rejected, try drawing instead
        bot.client.send({ type: 'PLAYER_ACTION', action: { type: 'DRAW_CARD' } });
        bot.hasDrawnThisTurn = true;
      }

      if (msg.type === 'GAME_OVER') {
        console.log(`[${bot.credentials.displayName}] Game over! Winner: ${msg.winnerId}, Points: ${msg.points}`);
      }
    });
  }

  stop(): void {
    for (const bot of this.bots) {
      bot.client.close();
    }
    this.bots = [];
    console.log('All bots disconnected.');
  }
}
```

## Usage (from CLI)
```typescript
// run-bots.ts — entry point
import { BotRunner } from './bot-runner.js';

const roomCode = process.argv[2];
if (!roomCode) {
  console.error('Usage: npx tsx packages/server/src/__tests__/bots/run-bots.ts <ROOM_CODE>');
  process.exit(1);
}

const runner = new BotRunner();
await runner.start(roomCode);

// Keep process alive, clean up on exit
process.on('SIGINT', () => {
  runner.stop();
  process.exit(0);
});
```

## Flow Summary
1. Human opens browser, logs in, creates a room → sees room code (e.g. "ABCD")
2. Human runs: `npx tsx packages/server/src/__tests__/bots/run-bots.ts ABCD`
3. Three bots join the room
4. Human clicks "Start Game" in the browser
5. Bots auto-play when it's their turn
6. Human plays their turns manually in the browser
7. Game continues until someone wins
8. Ctrl+C to stop bots

## Error Handling
- If a move is rejected, bot falls back to DRAW_CARD
- If WebSocket disconnects, bot logs and stops (no auto-reconnect needed for tests)
- 5-second timeout on join confirmation
