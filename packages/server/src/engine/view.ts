import type { GameEvent, GameState } from '@hafte-kasif/shared';
import { cardEquals } from '@hafte-kasif/shared';

/**
 * Filter events for a specific player's view.
 * Hides card identity in CARD_GIVEN events for bystanders
 * (players who are neither the giver nor the receiver),
 * unless the card was already revealed by a queen.
 */
export function filterEventsForPlayer(
  events: GameEvent[],
  playerId: string,
  stateBefore: GameState,
): GameEvent[] {
  return events.map(event => {
    if (event.type !== 'CARD_GIVEN') return event;

    // Giver and receiver always see the card
    if (playerId === event.fromPlayerId || playerId === event.toPlayerId) {
      return event;
    }

    // Bystander: check if the card was already revealed
    const giver = stateBefore.players.find(p => p.id === event.fromPlayerId);
    if (giver && event.card && giver.revealedCards.some(r => cardEquals(r, event.card!))) {
      return event;
    }

    // Hide card for bystanders
    return { ...event, card: null };
  });
}
