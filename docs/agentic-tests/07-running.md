# How to Run Agentic Bot Players

## Prerequisites

```bash
# Start the dev environment
docker compose -f docker-compose.dev.yml up

# Verify server is running
curl http://localhost:3000
```

## Step-by-step

### 1. Log in via browser
- Open http://localhost:3000
- Log in with your registered email (magic link)

### 2. Create a room
- Click "Create Room"
- Select game mode (standard recommended)
- Note the room code displayed (e.g. "ABCD")

### 3. Launch the bots (in a separate terminal)
```bash
# Using the same env vars as the server
JWT_SECRET=<your-secret> \
DATABASE_URL="postgresql://hk:devpass@localhost:5432/hafte_kasif" \
npx tsx packages/server/src/__tests__/bots/run-bots.ts ABCD
```

You should see:
```
Creating bot credentials...
[Bot Alice] Connected
[Bot Alice] Joined room ABCD as user_X
[Bot Bob] Connected
[Bot Bob] Joined room ABCD as user_Y
[Bot Charlie] Connected
[Bot Charlie] Joined room ABCD as user_Z
All bots joined. Waiting for game to start...
```

### 4. Start the game (in browser)
- You should now see 4 players in the lobby
- Select cards per player (2-7)
- Click "Start Game"

### 5. Play!
- When it's your turn, play a card or draw
- When it's a bot's turn, it plays automatically (with a slight delay)
- Watch the terminal for bot action logs

### 6. Stop bots
- Press Ctrl+C in the terminal
- Or just close the terminal

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "JWT_SECRET not set" | Set the same JWT_SECRET as in docker-compose.dev.yml |
| "Timeout waiting for ROOM_JOINED" | Check room code is correct and server is running |
| Bot move rejected repeatedly | Check server logs for validation errors |
| Bots don't respond | Check if game phase is 'playing' in server logs |
| "Authentication required" | JWT_SECRET mismatch between bot script and server |

## Environment Variables

| Variable | Value | Notes |
|----------|-------|-------|
| JWT_SECRET | Must match server | Check docker-compose.dev.yml |
| DATABASE_URL | postgresql://hk:devpass@localhost:5432/hafte_kasif | Dev DB |

## Shortcut Script (optional)

You can add an npm script to package.json for convenience:

```json
{
  "scripts": {
    "bots": "tsx packages/server/src/__tests__/bots/run-bots.ts"
  }
}
```

Then run: `JWT_SECRET=xxx DATABASE_URL=xxx npm run bots -- ABCD`

## Implementation Order

When building this, implement in order:

1. **bot-auth.ts** — test by running standalone, verify tokens
2. **bot-client.ts** — test by connecting to server, sending a ping
3. **bot-brain.ts** — test with mock PlayerView objects (unit tests)
4. **bot-runner.ts** — wire together and test with a real room
5. **run-bots.ts** — CLI entry point

Each piece can be tested independently before integration.
