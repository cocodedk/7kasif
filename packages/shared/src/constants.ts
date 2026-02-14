import type { Suit, Value, Card, CellMarker, ScoreRow, PlayerScore } from './types.js';

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
export const VALUES: Value[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 'jack', 'queen', 'king', 'ace'];

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 4;
export const MIN_CARDS_PER_PLAYER = 2;
export const MAX_CARDS_PER_PLAYER = 7;

export const CARD_HAND_VALUES: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6,
  '7': 7, '8': 8, '9': 9, '10': 10,
  'jack': 11, 'queen': 12, 'king': 13, 'ace': 14,
};

export const FINISH_POINTS = {
  normal: 1,
  jack: 2,
  two_empty: 3, // 2 as very last card (nothing to give)
  two_with_give: 1, // 2 played, gave a card, now empty
  ace_chain_full: 4, // 4 Aces + finishing card
};

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const value of VALUES) {
      deck.push({ suit, value });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function cardEquals(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.value === b.value;
}

export function cardToString(card: Card): string {
  const suitSymbol = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' }[card.suit];
  const valueStr = typeof card.value === 'number' ? String(card.value) : card.value[0].toUpperCase();
  return `${valueStr}${suitSymbol}`;
}

// ─── Scoring Table ───

const CELLS_PER_ROW = 4;

export function createEmptyPlayerScore(playerId: string, playerName: string): PlayerScore {
  return {
    playerId,
    playerName,
    rows: [{ cells: [null, null, null, null] }],
    plusClusters: 0,
    minusClusters: 0,
    netScore: 0,
  };
}

/**
 * Apply points to a player's scoring table.
 * Points fill cells in the current row; overflow spills into the next row.
 * Special: ace_chain_full (4 points) fills a brand new row, leaving current row untouched.
 */
export function applyPoints(
  score: PlayerScore,
  marker: CellMarker,
  points: number,
  isAceChainFull: boolean = false,
): PlayerScore {
  const result: PlayerScore = {
    ...score,
    rows: score.rows.map(r => ({ cells: [...r.cells] })),
    plusClusters: score.plusClusters,
    minusClusters: score.minusClusters,
    netScore: score.netScore,
  };

  if (isAceChainFull && points === 4) {
    // Special: fill a brand new row with 4 I markers
    const newRow: ScoreRow = { cells: [marker, marker, marker, marker] };
    result.rows.push(newRow);
    result.plusClusters++;
    result.netScore = result.plusClusters - result.minusClusters;
    return result;
  }

  let remaining = points;
  while (remaining > 0) {
    // Find current active row (last row with empty cells)
    let activeRow = result.rows[result.rows.length - 1];
    const emptyIdx = activeRow.cells.indexOf(null);

    if (emptyIdx === -1) {
      // Current row is full, start a new one
      activeRow = { cells: [null, null, null, null] };
      result.rows.push(activeRow);
    }

    const idx = activeRow.cells.indexOf(null);
    if (idx !== -1) {
      activeRow.cells[idx] = marker;
      remaining--;

      // Check if row is now complete
      if (activeRow.cells.every(c => c !== null)) {
        const allSame = activeRow.cells.every(c => c === activeRow.cells[0]);
        if (allSame) {
          if (activeRow.cells[0] === 'I') result.plusClusters++;
          else result.minusClusters++;
        }
        // Mixed row = 0, no change to clusters
      }
    }
  }

  result.netScore = result.plusClusters - result.minusClusters;
  return result;
}

export function handValue(hand: Card[]): number {
  let total = 0;
  let jackCount = 0;
  for (const card of hand) {
    total += CARD_HAND_VALUES[String(card.value)];
    if (card.value === 'jack') jackCount++;
  }
  for (let i = 0; i < jackCount; i++) {
    total *= 2;
  }
  return total;
}
