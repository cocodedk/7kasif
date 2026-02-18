# Agentic Bot Players: Overview

## Goal

One human player + 3 bot agents play a complete hand of Hafte Kasif through the real WebSocket server. This is an end-to-end integration test that verifies bots can authenticate, connect, receive game state, and execute valid moves.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Human (you)│────▶│  WS Server   │◀────│  Bot Agent 1 │
│  via browser │     │  /ws         │◀────│  Bot Agent 2 │
└─────────────┘     │  port 3000   │◀────│  Bot Agent 3 │
                    └──────────────┘     └──────────────┘
```

- Bots connect via WebSocket just like the browser client
- Each bot has its own JWT token (from a real registered user)
- Bots receive `GAME_STATE` and respond with `PLAYER_ACTION`
- The human creates the room and starts the game, bots join automatically

## File Structure (what we'll build)

```
packages/server/src/__tests__/bots/
  bot-client.ts      — WebSocket client wrapper
  bot-brain.ts       — Decision engine (picks actions)
  bot-runner.ts      — Orchestrator (creates users, connects bots, joins room)
  bot-auth.ts        — Bot user creation & JWT token generation
```

## Steps (links to other docs)

1. 01-overview.md (this file)
2. [02-bot-auth.md](./02-bot-auth.md) — Create bot users and generate JWT tokens
3. [03-bot-client.md](./03-bot-client.md) — WebSocket client that connects, sends, receives
4. [04-bot-brain.md](./04-bot-brain.md) — Decision engine: evaluate state, pick action
5. [05-bot-runner.md](./05-bot-runner.md) — Orchestrator: wire it all together
6. [06-play-hand.md](./06-play-hand.md) — The actual test: human + 3 bots play one hand
7. [07-running.md](./07-running.md) — How to run it

## Constraints

- Bots must authenticate with real JWT tokens (no guest mode)
- Bots connect to the same server the human uses (localhost:3000)
- No modifications to the game engine or server — bots are pure clients
- Use the shared `isCardPlayable` function for move validation
