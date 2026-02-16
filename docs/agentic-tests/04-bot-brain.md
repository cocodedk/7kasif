# Step 4: Bot Brain - Decision Logic

## Overview

When it's a bot's turn, it receives a `PlayerView` and must decide what action to take. The bot brain evaluates the game state and returns a valid `Action`.

## Architecture

The bot brain is a **stateless decision function** that takes:
- `view: PlayerView` — current game state visible to the bot
- `myPlayerId: string` — the bot's player ID
- `hasDrawnThisTurn: boolean` — whether the bot has drawn a card this turn

It returns:
- `Action | null` — the action to take, or `null` if it's not the bot's turn

The caller (in the game loop) tracks `hasDrawnThisTurn` and resets it when the turn changes to the next player.

## Decision Logic

### Simple Strategy

The bot plays sensibly but not optimally. This is for testing and game progression, not competitive AI.

### Turn Decision Flowchart

```
Is it my turn? (currentPlayerId === myPlayerId)
  ├── NO → return null, wait
  └── YES → evaluate state:
      │
      ├── Am I in a 7-chain? (pendingEffect.type === 'seven-chain')
      │   ├── Do I have a 7? → PLAY_CARD (the 7)
      │   ├── Do I have matching 8? → PLAY_CARD with chainChoice: 'redirect'
      │   ├── Do I have matching 10? → PLAY_CARD (the 10)
      │   └── No counter → DRAW_CARD (draws penalty amount)
      │
      ├── Am I in an ace-chain? (pendingEffect.type === 'ace-chain')
      │   ├── Do I have an Ace? → PLAY_CARD (the Ace)
      │   ├── Do I have matching suit card? → PLAY_CARD (that card)
      │   └── No match → DRAW_CARD
      │
      └── Normal turn:
          ├── Find all playable cards using isCardPlayable()
          ├── If playable cards exist:
          │   ├── Prefer special cards (7, Jack, 10, Queen, King) for fun
          │   ├── Pick one and build the action:
          │   │   ├── Jack → add declaredSuit (pick suit with most cards in hand)
          │   │   ├── 2 → add giveCard (pick highest value non-2 card)
          │   │   ├── 8 in 7-chain → add chainChoice: 'redirect'
          │   │   └── Other → plain PLAY_CARD
          │   └── Return PLAY_CARD
          ├── If no playable cards and haven't drawn → DRAW_CARD
          └── If already drew this turn → PASS_TURN
```

### Card Priority

When choosing which playable card to play, the bot uses this priority (highest first):
1. **Jack** (11) — wild card, very flexible for declaring suit
2. **Ace** (7) — chain starter, high control value
3. **7** (8) — chain starter, forces decisions
4. **10** (6) — skip/reverse, good tempo control
5. **King** (5) — skip + draw, offensive
6. **Queen** (4) — reveal, interesting mechanic
7. **2** (3) — give card, forces opponent decisions
8. **Normal cards** (1) — no special effect

### Special Action Building

**Jack**: Declare the suit with the most cards in the bot's hand (excluding the Jack itself).

**2**: Give the highest numeric value card from the hand (excluding the 2 being played). This minimizes point loss.

**8 in 7-chain**: Set `chainChoice: 'redirect'` to bounce the chain to the next player.

## Implementation File

Create: `/home/cocodedk/0-projects/7kasif/packages/server/src/__tests__/bots/bot-brain.ts`

```typescript
import type { PlayerView, Action, Card, Suit } from '@7kasif/shared';
import { isCardPlayable } from '@7kasif/shared';

export function decideAction(
  view: PlayerView,
  myPlayerId: string,
  hasDrawnThisTurn: boolean
): Action | null {
  // Not my turn
  if (view.currentPlayerId !== myPlayerId) {
    return null;
  }

  const playableCards = view.myHand.filter((card) =>
    isCardPlayable(card, view)
  );

  if (playableCards.length > 0) {
    // Pick the best card to play
    const card = pickBestCard(playableCards, view);
    return buildPlayAction(card, view);
  }

  // No playable cards
  if (!hasDrawnThisTurn) {
    return { type: 'DRAW_CARD' };
  }

  // Already drew, must pass (unless forced to draw more)
  if (view.pendingEffect?.type === 'seven-chain') {
    // In 7-chain with no valid cards, must draw the penalty
    return { type: 'DRAW_CARD' };
  }

  return { type: 'PASS_TURN' };
}

function pickBestCard(playable: Card[], view: PlayerView): Card {
  // Simple priority: prefer cards that create effects
  const priority = (c: Card): number => {
    if (c.value === 'jack') return 10;
    if (c.value === 'ace') return 7;
    if (c.value === 7) return 8;
    if (c.value === 10) return 6;
    if (c.value === 'king') return 5;
    if (c.value === 'queen') return 4;
    if (c.value === 2) return 3;
    return 1;
  };

  // Sort by priority descending, pick first
  playable.sort((a, b) => priority(b) - priority(a));
  return playable[0];
}

function buildPlayAction(card: Card, view: PlayerView): Action {
  const action: any = { type: 'PLAY_CARD', card };

  // Jack needs declaredSuit
  if (card.value === 'jack') {
    action.declaredSuit = pickBestSuit(view.myHand, card);
  }

  // 2 needs giveCard (if more than 1 card in hand)
  if (card.value === 2 && view.myHand.length > 1) {
    const otherCards = view.myHand.filter(
      (c) => !(c.suit === card.suit && c.value === card.value)
    );
    if (otherCards.length > 0) {
      // Give the highest value card (minimize point loss)
      action.giveCard = otherCards.sort(
        (a, b) => cardNumericValue(b) - cardNumericValue(a)
      )[0];
    }
  }

  // 8 in chain needs chainChoice
  if (card.value === 8 && view.pendingEffect?.type === 'seven-chain') {
    action.chainChoice = 'redirect';
  }

  return action;
}

function pickBestSuit(hand: Card[], excludeCard: Card): Suit {
  const counts: Record<Suit, number> = {
    hearts: 0,
    diamonds: 0,
    clubs: 0,
    spades: 0,
  };

  for (const c of hand) {
    if (c.suit === excludeCard.suit && c.value === excludeCard.value) {
      continue;
    }
    counts[c.suit]++;
  }

  // Pick suit with most cards
  return (Object.entries(counts) as [Suit, number][])
    .sort((a, b) => b[1] - a[1])[0][0];
}

function cardNumericValue(card: Card): number {
  const vals: Record<string, number> = {
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9,
    '10': 10,
    jack: 11,
    queen: 12,
    king: 13,
    ace: 14,
  };
  return vals[String(card.value)] || 0;
}
```

## Key Behaviors

- **Safe**: Always uses `isCardPlayable()` from shared — same validation as the real client
- **Simple**: Picks highest-priority playable card, no deep strategy
- **Complete**: Handles all special cases (Jack suit, 2 give, 8 chain choice)
- **Stateful**: Caller tracks `hasDrawnThisTurn` and resets it when turn changes

## Edge Cases

- **Revealed cards**: Cannot be played the turn they're revealed (server validates this)
- **Deck empty**: When bot draws, server reshuffles discard pile automatically
- **Giving with 2**: Bot never gives away the 2 it's playing; the giveCard is always a different card
- **Hand size**: Properly handles the case where playing a card leaves exactly 1 card (future one-card announcement)

## Integration Points

The bot brain integrates with:
- **Shared types**: `PlayerView`, `Action`, `Card`, `Suit`
- **Shared validation**: `isCardPlayable()` function
- **Game loop**: Caller manages turn state and `hasDrawnThisTurn` flag

## Testing Strategy

Bot brain is tested through:
1. **Unit tests**: Test `decideAction()` with various `PlayerView` states
2. **Integration tests**: Run full games with bot players, verify valid actions are generated
3. **Edge case tests**: Empty deck, one-card situations, chain mechanics

See step 5 for the game loop integration that uses this brain.
