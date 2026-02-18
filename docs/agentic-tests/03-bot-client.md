# Step 3: Bot WebSocket Client

Building a WebSocket client wrapper that allows bot players to communicate with the game server, mirroring browser behavior.

## Problem Statement

Bots need to:
- Connect to the WebSocket endpoint (`/ws`)
- Send typed JSON messages (ClientMessage)
- Receive typed JSON messages (ServerMessage)
- Handle multiple concurrent message types
- Support both persistent listeners and one-shot async waiting

The browser uses a native WebSocket; bots need an equivalent that works in Node.js.

## Solution Overview

Create a `BotClient` class using the `ws` package (already a server dependency) that wraps WebSocket functionality with:
- Promise-based connection
- Message type safety via shared types
- Multiple message handler patterns
- Built-in timeout support

## Implementation

File: `packages/server/src/__tests__/bots/bot-client.ts`

```typescript
import WebSocket from 'ws';
import type { ClientMessage, ServerMessage } from '@7kasif/shared';

type MessageHandler = (msg: ServerMessage) => void;

export class BotClient {
  private ws: WebSocket | null = null;
  private handlers: MessageHandler[] = [];
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);
      this.ws.on('open', () => {
        console.log(`[${this.name}] Connected`);
        resolve();
      });
      this.ws.on('message', (data) => {
        const msg: ServerMessage = JSON.parse(data.toString());
        for (const handler of this.handlers) {
          handler(msg);
        }
      });
      this.ws.on('error', (err) => {
        console.error(`[${this.name}] WS error:`, err.message);
        reject(err);
      });
      this.ws.on('close', () => {
        console.log(`[${this.name}] Disconnected`);
      });
    });
  }

  send(msg: ClientMessage): void {
    if (!this.connected) {
      console.warn(`[${this.name}] Skipping send — WebSocket not connected`);
      return;
    }
    this.ws!.send(JSON.stringify(msg));
  }

  onMessage(handler: MessageHandler): void {
    this.handlers.push(handler);
  }

  // Wait for a specific message type (with timeout)
  waitFor<T extends ServerMessage['type']>(
    type: T,
    timeoutMs: number = 5000,
  ): Promise<Extract<ServerMessage, { type: T }>> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`[${this.name}] Timeout waiting for ${type}`));
      }, timeoutMs);

      const handler = (msg: ServerMessage) => {
        if (msg.type === type) {
          clearTimeout(timer);
          this.handlers = this.handlers.filter(h => h !== handler);
          resolve(msg as Extract<ServerMessage, { type: T }>);
        }
      };
      this.handlers.push(handler);
    });
  }

  close(): void {
    this.ws?.close();
    this.ws = null;
  }
}
```

## API Reference

### Constructor
```typescript
constructor(name: string)
```
Creates a new bot client with a display name (used in logging).

### connect(url: string): Promise<void>
Initiates WebSocket connection. Resolves when the connection opens, rejects on error.

```typescript
await bot.connect('ws://localhost:3000/ws');
```

### send(msg: ClientMessage): void
Sends a typed message to the server. Logs a warning and returns silently if WebSocket is not in OPEN state.

```typescript
bot.send({ type: 'JOIN_ROOM', roomCode: 'ABCD', playerName: 'Alice', token });
```

### onMessage(handler: MessageHandler): void
Registers a persistent message handler that fires for every incoming message. Handler remains active until client closes.

```typescript
bot.onMessage((msg) => {
  if (msg.type === 'GAME_STATE') {
    // Act on game state
  }
});
```

### waitFor<T>(type: T, timeoutMs?: number): Promise<Extract<ServerMessage, { type: T }>>
Waits for a specific message type to arrive. Returns a typed Promise. Automatically cleans up the handler after the message arrives. Default timeout is 5 seconds.

```typescript
const joined = await bot.waitFor('ROOM_JOINED');
console.log('Player ID:', joined.playerId);
```

### close(): void
Closes the WebSocket connection and cleans up resources.

```typescript
bot.close();
```

## Usage Pattern

```typescript
import { BotClient } from './__tests__/bots/bot-client';

const bot = new BotClient('Bot Alice');
await bot.connect('ws://localhost:3000/ws');

// Send join request
bot.send({
  type: 'JOIN_ROOM',
  roomCode: 'ABCD',
  playerName: 'Bot Alice',
  token: 'auth-token-here',
});

// Wait for confirmation
const joined = await bot.waitFor('ROOM_JOINED');
console.log('Joined as player:', joined.playerId);

// Listen for game events
bot.onMessage((msg) => {
  if (msg.type === 'GAME_STATE') {
    console.log('Game started:', msg.gameState);
  }
  if (msg.type === 'TURN_REQUEST') {
    // Bot makes a decision and plays a card
    bot.send({ type: 'PLAYER_ACTION', action: { type: 'PLAY_CARD', card: someCard } });
  }
});

// Later...
bot.close();
```

## Key Design Decisions

1. **Promise-based connect**: Returns a Promise that resolves only when the WebSocket is fully open, preventing send attempts before the connection is ready.

2. **Message handler array**: Multiple handlers can be registered via `onMessage()`, allowing different parts of bot logic to listen to the same stream.

3. **waitFor with automatic cleanup**: One-shot handlers for confirmation messages are automatically removed after they fire, preventing memory leaks in long-running bots.

4. **Type safety**: Uses TypeScript's `Extract` utility to ensure the Promise resolves with the correct message shape based on the requested type.

5. **Timeout support**: Built-in timeout prevents bots from hanging indefinitely if the server doesn't respond.

6. **Named logging**: All log messages include the bot's name for clarity when debugging multiple bots.

## Dependencies

- `ws` — WebSocket client library (already installed as server dependency)
- `@7kasif/shared` — For `ClientMessage` and `ServerMessage` types

## Next Steps

Step 4 will implement a `BotPlayer` class that uses `BotClient` to play the game according to defined strategies (decision logic for which card to play, when to challenge, etc.).
