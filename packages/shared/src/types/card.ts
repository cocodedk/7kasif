export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

export type Value = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 'jack' | 'queen' | 'king' | 'ace';

export interface Card {
  suit: Suit;
  value: Value;
}
