# Hafte Kasif — Test Scenarios

## Basic Turn Flow

### 1. Normal card play — same suit
- Top card: 4 of hearts
- Player plays: 6 of hearts
- Expected: Valid play, 6 of hearts effect triggers (next two players draw 1 each)

### 2. Normal card play — same value
- Top card: 4 of hearts
- Player plays: 4 of spades
- Expected: Valid play, no effect (4 is normal)

### 3. Invalid play — no match
- Top card: 4 of hearts
- Player plays: 9 of clubs
- Expected: Rejected — does not match suit or value

### 4. Player draws when no playable card
- Player has no card matching top card's suit or value (and no Jack)
- Expected: Player must draw 1 card. Player can then play a card or announce pass.

### 5. Player draws and plays
- Player has no playable card, draws, gets a matching card
- Expected: Player can play the drawn card. Or keep it and pass.

### 5b. Player must announce pass
- Player draws a card but does not want to play
- Expected: Player must explicitly announce they are passing their turn.

---

## Ace Mechanics

### 6. Single Ace play + follow-up from hand
- Player plays Ace of hearts, then plays 5 of hearts from hand
- Expected: Valid. Both cards played in one turn.

### 7. Ace chain — two Aces + follow-up
- Player plays Ace of hearts, Ace of clubs, then 7 of clubs
- Expected: Valid. Three cards played in one turn. 7 of clubs triggers its effect.

### 8. Ace play + draw (no follow-up in hand)
- Player plays Ace of hearts, has no hearts in hand, draws a card
- Expected: Player can play the drawn card if it matches, or play from hand if possible, or announce pass.

### 9. Ace play + draw playable card
- Player plays Ace of hearts, draws 3 of hearts
- Expected: Player CAN play the 3 of hearts. Or keep it and announce pass.

### 10. Ace chain finish — 4 Aces + final card
- Player has: Ace♥, Ace♦, Ace♣, Ace♠, 4♠
- Plays all 4 Aces then 4 of spades
- Expected: Player wins with 4 points. New row filled with 4 I's.

### 11. Ace chain — no finishing card, must draw
- Player has: Ace♥, Ace♦ (2 cards)
- Plays Ace♥, then Ace♦. No card to play on top.
- Expected: Player must draw. Turn ends.

---

## Card Effects

### 12. Play a 2 — give card to next player
- Player plays 2 of hearts, gives 5 of clubs to next player
- Expected: Next player receives 5 of clubs. Normal turn flow continues.

### 13. Finish with 2 as last card
- Player has only 2 of hearts. Plays it.
- Expected: Player wins with 3 points. No card to give.

### 14. Play 2, give card, become empty
- Player has 2 of hearts and 5 of clubs. Plays 2, gives 5 to next player.
- Expected: Player wins with 1 point (not 3).

### 15. Play a 3 — previous player draws
- Player plays 3 of clubs
- Expected: The player who played immediately before draws 1 card.

### 16. Play a 6 — two players draw
- Player plays 6 of diamonds
- Expected: Next two players in turn order each draw 1 card. Their turns are not skipped.

### 17. 9 of diamonds — all others draw
- Player plays 9 of diamonds
- Expected: All other players draw 1 card each.

### 18. Normal 9 (not diamonds)
- Player plays 9 of hearts
- Expected: No special effect. Normal play.

### 19. Play an 8 — skip next player
- Player A plays 8 of clubs
- Expected: Player B is skipped. Turn goes to Player C.

### 20. Play a 10 — reverse direction
- Direction is clockwise. Player plays 10 of hearts.
- Expected: Direction becomes counter-clockwise.

---

## Jack (Wild Card)

### 21. Jack played on any card
- Top card: 5 of hearts. Player plays Jack of clubs, declares spades.
- Expected: Valid. Next player must play a spade (or another Jack).

### 22. Finish with Jack
- Player has only Jack of diamonds. Plays it, declares any suit.
- Expected: Player wins with 2 points.

### 23. Jack cannot counter chain reaction
- Chain reaction in progress (7 was played, penalty is 2).
- Next player tries to play Jack.
- Expected: Rejected. Jack cannot participate in 7-8-10 chains.

---

## Queen

### 24. Queen — next player reveals a card
- Player plays Queen of hearts. Next player has 5 cards.
- Expected: Next player chooses 1 card to reveal. That card is visible to all and cannot be played this turn.

### 25. Queen — next player has only 1 card
- Player plays Queen. Next player has only 3 of clubs.
- Expected: Next player reveals 3 of clubs. Must draw. Can play drawn card if it matches the house.

### 26. Revealed card stays visible
- Player had a card revealed by a Queen 3 turns ago.
- Expected: Card is still visible to all until the player plays it.

---

## King (Saw)

### 27. Single King — skip + penalty
- Player A plays King of hearts.
- Expected: Player B is skipped and draws 1 card. Turn goes to Player C.

### 28. King saw — two Kings
- Player A plays King of hearts. Player C plays King of spades.
- Expected: Player B skipped (draws 1), Player D skipped (draws 1). Turn goes to Player A.

### 29. King saw — skipped player cannot counter
- Player A plays King. Player B has a King.
- Expected: Player B is skipped and draws 1. Player B cannot play their King in response.

---

## Chain Reaction (7-8-10)

### 30. Simple 7 — no counter
- Player A plays 7 of hearts. Player B has no 7, 8♥, or 10♥.
- Expected: Player B draws 2 cards.

### 31. 7 chain — two 7s
- Player A plays 7♥. Player B plays 7♦.
- Expected: Penalty is now 4. Player C must counter or draw 4.

### 32. 7 + 8 (same suit) — redirect
- Player A plays 7♥. Player B plays 8♥, chooses redirect.
- Expected: Penalty (2) redirected to player 2 positions ahead of B.

### 33. 7 + 8 (same suit) — add 3
- Player A plays 7♥. Player B plays 8♥, chooses add.
- Expected: Penalty is now 5 (2+3). Player C must counter or draw 5.

### 34. 7 + 10 (same suit) — reverse
- Player A plays 7♥. Player B plays 10♥.
- Expected: Penalty stays at 2. Direction reverses. Player A must now counter or draw 2.

### 35. Complex chain — 7, 7, 10, back
- Player A plays 7♥ (penalty 2). Player B plays 7♣ (penalty 4). Player C plays 10♣ (penalty 4, reversed). Now Player B must counter or draw 4.
- Expected: Chain reversed, Player B faces the penalty.

### 36. 8 wrong suit in standard mode
- Player A plays 7♥. Player B tries to play 8♣.
- Expected: Rejected in standard mode (must be 8♥). Allowed in freestyle mode.

---

## Winning & Scoring

### 37. Normal finish — 1 point
- Player plays last card (not 2 or Jack).
- Expected: Winner gets 1 point (I). Loser (highest hand value) gets 1 loss (X).

### 38. Loser determination — Jack multiplier
- Player A: hand value 20 (no Jacks). Player B: hand value 15 with 1 Jack = 30.
- Expected: Player B is the loser (30 > 20).

### 39. Loser determination — double Jack
- Player has 2 Jacks (22) + other cards (10) = 32. Multiplied: 32 × 2 × 2 = 128.
- Expected: That player almost certainly loses.

### 40. Tie for highest — reversal
- Winner finishes with normal card (1 point). Two players tie for highest hand value.
- Expected: REVERSAL — winner gets -1, both tied players get +1.

### 41. Scoring — fill a row
- Player has 3 I's in current row. Wins 1 point.
- Expected: Row becomes [I, I, I, I] = +1 cluster. New row starts.

### 42. Scoring — overflow
- Player has 3 I's in current row. Wins 2 points (Jack finish).
- Expected: 1 point fills current row [I, I, I, I] = +1 cluster. 1 point starts new row [I, _, _, _].

### 43. Scoring — mixed row is worthless
- Player has row: [I, I, X, _]. Gets 1 loss.
- Expected: Row becomes [I, I, X, X] = 0 points. Row is wasted.

---

## First Card (Dealer Flip)

### 44. Flipped card is an Ace
- Dealer flips Ace of hearts.
- Expected: Dealer must play a card on top (Ace rules apply to dealer).

### 45. Flipped card is a 7
- Dealer flips 7 of spades.
- Expected: First player (right of dealer) must draw 2 or counter with 7/8♠/10♠.

### 46. Flipped card is a Jack
- Dealer flips Jack of diamonds.
- Expected: Dealer chooses the new house (suit).

### 47. Flipped card is a King
- Dealer flips King of clubs.
- Expected: First player is skipped and draws 1 card.

---

## One-Card Announcement

### 51. Player announces one card
- Player plays a card, now has 1 card left, announces it
- Expected: Valid. Game continues. Other players are aware.

### 52. Player forgets to announce one card
- Player plays a card, now has 1 card left, does NOT announce
- Another player notices and calls it out
- Expected: Penalty — the player must draw 1 card (now has 2 cards).

### 53. No one notices missed announcement
- Player plays a card, now has 1 card left, does NOT announce
- No one calls it out before the next play
- Expected: No penalty (only applies if someone catches it).

---

## Edge Cases

### 48. Draw pile exhausted
- Draw pile is empty. Player needs to draw.
- Expected: Discard pile is shuffled to form new draw pile. Player draws from it.

### 49. Ace as first flipped card — dealer has no matching card
- Dealer flips Ace of spades. Dealer has no spades and no Aces.
- Expected: Dealer must draw a card.

### 50. All 4 Kings played in a saw (3-player game)
- Players A, B, C. Player A plays King, C plays King, B (was skipped once, now back) plays King, A plays King.
- Expected: All non-active players each skipped once and drew 1. Need to verify correct turn tracking.
