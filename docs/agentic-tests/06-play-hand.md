# Step 6: Play a Complete Hand with 1 Human + 3 Bots

Document exactly what happens during a complete hand with 1 human + 3 bots.

## Preconditions

- Dev server running: `docker compose -f docker-compose.dev.yml up`
- Database has the schema (server creates it on startup)
- `JWT_SECRET` environment variable is set
- Human has a registered account and is logged in via browser

## Complete Hand Flow

### Phase 1: Room Setup

```
Human (browser):
  1. Logs in via magic link
  2. Clicks "Create Room" → selects mode (standard/freestyle)
  3. Server returns room code, e.g. "ABCD"
  4. Sees lobby with 1 player (themselves)

Terminal:
  5. Run: JWT_SECRET=<same-secret> DATABASE_URL=<db-url> npx tsx packages/server/src/__tests__/bots/run-bots.ts ABCD
  6. Bots connect, authenticate, join room
  7. Human sees 4 players in lobby
```

### Phase 2: Game Start

```
Human (browser):
  8. Selects cards per player (e.g. 7)
  9. Clicks "Start Game"
  10. Server deals cards, determines first player
  11. All 4 players receive GAME_STATE with their hands
```

### Phase 3: Playing (repeats until someone wins)

```
For each turn:
  12. Server broadcasts GAME_STATE (currentPlayerId indicates whose turn)

  If it's a bot's turn:
    13. Bot receives GAME_STATE
    14. bot-brain evaluates: finds playable cards
    15. Bot picks best action (300-800ms delay)
    16. Bot sends PLAYER_ACTION
    17. Server validates, applies effect, broadcasts new GAME_STATE

  If it's human's turn:
    13. Human sees their cards highlighted
    14. Human clicks a card to play (or draws)
    15. Server validates, applies effect, broadcasts new GAME_STATE

  Special situations:
    - 7-chain: affected player must counter (7/8/10) or draw penalty
    - Jack played: bot declares suit with most cards in hand
    - 2 played: bot gives highest-value card to next player
    - Queen played: random card of next player is revealed
    - King played: next player is skipped + draws 1
    - 10 played: direction reverses
    - One card left: bot announces immediately
```

### Phase 4: Round End

```
  18. A player empties their hand → server determines winner/loser
  19. Server sends GAME_OVER to all:
      { winnerId, loserId, points, reversed }
  20. Server sends TOURNAMENT_UPDATE with scoring
  21. Human sees results screen
```

### Phase 5: Cleanup

```
  22. Human can start next round or end session
  23. Ctrl+C in terminal stops the bots
```

## Expected Console Output (bots)

```
Creating bot credentials...
[Bot Alice] Connected
[Bot Alice] Joined room ABCD as user_10
[Bot Bob] Connected
[Bot Bob] Joined room ABCD as user_11
[Bot Charlie] Connected
[Bot Charlie] Joined room ABCD as user_12
All bots joined. Waiting for game to start...
[Bot Bob] Action: PLAY_CARD 7 of hearts
[Bot Charlie] Action: PLAY_CARD 7 of diamonds
[Bot Alice] Action: DRAW_CARD
[Bot Alice] Action: PASS_TURN
[Bot Bob] Action: PLAY_CARD queen of hearts
[Bot Charlie] Action: PLAY_CARD 5 of hearts
[Bot Alice] Announcing one card!
[Bot Alice] Action: PLAY_CARD jack of spades
[Bot Alice] Game over! Winner: user_10, Points: 1
```

## What This Tests

- WebSocket authentication flow
- Room join/lobby management
- Game state broadcasting
- Card playability validation
- All special card effects
- Turn rotation and direction changes
- One-card announcement
- Round completion and scoring
- Mixed human + bot gameplay
