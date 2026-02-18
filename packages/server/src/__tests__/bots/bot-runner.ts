import { BotClient } from './bot-client.js';
import { createBotCredentials, type BotCredentials } from './bot-auth.js';
import { decideAction } from './bot-brain.js';
import { GameLogger } from './game-logger.js';
import type { PlayerView, ServerMessage, Card, Action, TournamentView } from '@hafte-kasif/shared';

function cardKey(c: Card): string {
  return `${c.value}:${c.suit}`;
}

interface BotInstance {
  credentials: BotCredentials;
  client: BotClient;
  playerId: string;
  hasAnnounced: boolean;
  rejectedCards: Set<string>;
}

export class BotRunner {
  private bots: BotInstance[] = [];
  private serverUrl: string;
  private logger: GameLogger | null = null;
  private roundsPlayed = 0;
  private maxRounds = 1;
  private hostBot: BotInstance | null = null;
  private lastTournament: TournamentView | null = null;
  private onAllRoundsDone: (() => void) | null = null;
  private allRoundsDoneTriggered = false;

  constructor(serverUrl: string = 'ws://localhost:3000/ws') {
    this.serverUrl = serverUrl;
  }

  async start(roomCode: string, botCount?: number): Promise<void> {
    console.log('Creating bot credentials...');
    this.logger = new GameLogger(roomCode);
    const credentials = await createBotCredentials(botCount);

    for (const cred of credentials) {
      const client = new BotClient(cred.displayName);
      await client.connect(this.serverUrl);

      const bot: BotInstance = {
        credentials: cred,
        client,
        playerId: '',
        hasAnnounced: false,
        rejectedCards: new Set(),
      };

      client.send({
        type: 'JOIN_ROOM',
        roomCode,
        playerName: cred.displayName,
        token: cred.token,
      });

      const joined = await client.waitFor('ROOM_JOINED');
      bot.playerId = joined.playerId;
      console.log(`[${cred.displayName}] Joined room ${roomCode} as ${bot.playerId}`);

      this.setupGameLoop(bot);
      this.bots.push(bot);
    }

    console.log('All bots joined. Waiting for game to start...');
  }

  private setupGameLoop(bot: BotInstance): void {
    let lastCurrentPlayer = '';
    let lastAttemptedCard: Card | null = null;
    let lastAttemptedAction: Action | null = null;
    let lastView: PlayerView | null = null;
    const logger = this.logger;

    bot.client.onMessage((msg: ServerMessage) => {
      if (msg.type === 'DEBUG_GAME_INIT') {
        logger?.logInit(msg.deck, msg.dealerId, msg.cardsPerPlayer, msg.mode, msg.players);
        return;
      }

      if (msg.type === 'GAME_STATE') {
        const view: PlayerView = msg.state;

        // Log every game state and events received
        logger?.logGameState(bot.credentials.displayName, bot.playerId, view);
        if (msg.events) {
          logger?.logEvents(bot.credentials.displayName, msg.events);
        }

        // Reset rejected cards when turn changes
        if (view.currentPlayerId !== lastCurrentPlayer) {
          bot.rejectedCards.clear();
          lastCurrentPlayer = view.currentPlayerId;
        }

        // Reset announce flag when hand size changes from 1
        if (view.myHand.length !== 1) {
          bot.hasAnnounced = false;
        }

        if (view.currentPlayerId !== bot.playerId) return;
        if (view.phase !== 'playing') return;

        lastView = view;
        const delay = 5;
        setTimeout(() => {
          // Announce one card if needed — return and wait for next GAME_STATE to play
          if (view.myHand.length === 1 && !bot.hasAnnounced) {
            console.log(`[${bot.credentials.displayName}] Announcing one card!`);
            bot.hasAnnounced = true;
            const action = { type: 'ANNOUNCE_ONE_CARD' as const };
            logger?.logAction(bot.credentials.displayName, bot.playerId, action);
            bot.client.send({
              type: 'PLAYER_ACTION',
              action,
            });
            return;
          }

          const action = decideAction(view, bot.playerId, view.hasDrawnThisTurn, bot.rejectedCards);
          if (!action) return;
          if (action.type === 'PLAY_CARD') {
            lastAttemptedCard = action.card;
          }
          lastAttemptedAction = action;

          console.log(
            `[${bot.credentials.displayName}] Action: ${action.type}`,
            action.type === 'PLAY_CARD' || action.type === 'REVEAL_CARD'
              ? `${action.card.value} of ${action.card.suit}`
              : '',
          );

          logger?.logAction(bot.credentials.displayName, bot.playerId, action);
          bot.client.send({ type: 'PLAYER_ACTION', action });
        }, delay);
      }

      if (msg.type === 'MOVE_REJECTED') {
        console.error(`[${bot.credentials.displayName}] Move rejected: ${msg.reason}`);
        logger?.logRejected(bot.credentials.displayName, bot.playerId, msg.reason, lastAttemptedAction ?? undefined);

        // Only retry if it's still our turn
        if (!lastView || lastView.currentPlayerId !== bot.playerId) return;

        if (lastAttemptedCard) {
          // Track the last attempted card as rejected so we don't retry it
          bot.rejectedCards.add(cardKey(lastAttemptedCard));
          lastAttemptedCard = null;
          // Re-evaluate with the rejected card excluded
          const retry = decideAction(lastView, bot.playerId, lastView.hasDrawnThisTurn, bot.rejectedCards);
          if (retry) {
            if (retry.type === 'PLAY_CARD') lastAttemptedCard = retry.card;
            lastAttemptedAction = retry;
            console.log(`[${bot.credentials.displayName}] Retry: ${retry.type}`,
              retry.type === 'PLAY_CARD' ? `${retry.card.value} of ${retry.card.suit}` : '');
            logger?.logAction(bot.credentials.displayName, bot.playerId, retry);
            bot.client.send({ type: 'PLAYER_ACTION', action: retry });
          }
        } else if (lastAttemptedAction?.type === 'PASS_TURN') {
          // PASS was rejected (probably haven't drawn yet) — try drawing
          const retry: Action = { type: 'DRAW_CARD' };
          lastAttemptedAction = retry;
          console.log(`[${bot.credentials.displayName}] Retry: DRAW_CARD (after PASS rejected)`);
          logger?.logAction(bot.credentials.displayName, bot.playerId, retry);
          bot.client.send({ type: 'PLAYER_ACTION', action: retry });
        }
      }

      if (msg.type === 'TOURNAMENT_UPDATE') {
        this.lastTournament = msg.tournament;

        // Print summary once we have the final tournament update after the last round
        if (bot === this.hostBot && this.roundsPlayed >= this.maxRounds && !this.allRoundsDoneTriggered) {
          this.allRoundsDoneTriggered = true;
          console.log(`\n=== All ${this.maxRounds} rounds completed ===`);
          this.printTournamentSummary(msg.tournament);
          this.onAllRoundsDone?.();
        }
      }

      if (msg.type === 'GAME_OVER') {
        logger?.logGameOver(msg);

        // Only the host bot handles round transitions to avoid counting 4x
        if (bot === this.hostBot) {
          this.roundsPlayed++;
          console.log(
            `\nRound ${this.roundsPlayed}/${this.maxRounds} over! Winner: ${msg.winnerId}, Points: ${msg.points}, Reversed: ${msg.reversed}`,
          );
          if (logger) {
            console.log(`Game log: ${logger.filePath}`);
          }

          if (this.roundsPlayed < this.maxRounds) {
            setTimeout(() => {
              console.log(`\n--- Starting round ${this.roundsPlayed + 1}/${this.maxRounds} ---`);
              bot.client.send({ type: 'NEXT_ROUND', cardsPerPlayer: 5 });
            }, 1000);
          }
        }
      }
    });
  }

  private printTournamentSummary(t: TournamentView): void {
    console.log(`\nTournament Summary (${t.rounds.length} rounds):`);
    console.log('─'.repeat(50));
    for (const round of t.rounds) {
      const reversed = round.reversed ? ' [REVERSED]' : '';
      console.log(`  Round ${round.roundNumber}: winner=${round.winnerId} loser=${round.loserId} pts=${round.points} card=${round.finishingCardValue}${reversed}`);
    }
    console.log('─'.repeat(50));
    console.log('Scores:');
    for (const ps of t.playerScores) {
      const rows = ps.rows.map(r => r.cells.map(c => c ?? '.').join('')).join(' | ');
      console.log(`  ${ps.playerName}: net=${ps.netScore} (+${ps.plusClusters}/-${ps.minusClusters}) [${rows}]`);
    }
    console.log('─'.repeat(50));
  }

  async startAutonomous(rounds: number = 1): Promise<void> {
    this.maxRounds = rounds;
    this.roundsPlayed = 0;
    this.allRoundsDoneTriggered = false;
    console.log(`Creating bot credentials... (${rounds} round${rounds > 1 ? 's' : ''})`);
    const credentials = await createBotCredentials();

    // First bot creates the room
    const firstCred = credentials[0];
    const firstClient = new BotClient(firstCred.displayName);
    await firstClient.connect(this.serverUrl);

    firstClient.send({
      type: 'CREATE_ROOM',
      playerName: firstCred.displayName,
      mode: 'standard',
      token: firstCred.token,
    });

    const created = await firstClient.waitFor('ROOM_CREATED');
    const roomCode = created.roomCode;
    this.logger = new GameLogger(roomCode);
    console.log(`[${firstCred.displayName}] Created room ${roomCode}`);

    const firstBot: BotInstance = {
      credentials: firstCred,
      client: firstClient,
      playerId: created.playerId,
      hasAnnounced: false,
      rejectedCards: new Set(),
    };
    this.hostBot = firstBot;
    this.setupGameLoop(firstBot);
    this.bots.push(firstBot);

    // Remaining bots join
    for (const cred of credentials.slice(1)) {
      const client = new BotClient(cred.displayName);
      await client.connect(this.serverUrl);

      const bot: BotInstance = {
        credentials: cred,
        client,
        playerId: '',
        hasAnnounced: false,
        rejectedCards: new Set(),
      };

      client.send({
        type: 'JOIN_ROOM',
        roomCode,
        playerName: cred.displayName,
        token: cred.token,
      });

      const joined = await client.waitFor('ROOM_JOINED');
      bot.playerId = joined.playerId;
      console.log(`[${cred.displayName}] Joined room ${roomCode} as ${bot.playerId}`);

      this.setupGameLoop(bot);
      this.bots.push(bot);
    }

    // Create a promise that resolves when all rounds are done
    const done = new Promise<void>(resolve => {
      this.onAllRoundsDone = resolve;
    });

    // First bot starts the game
    console.log(`All bots joined. ${firstCred.displayName} (${firstBot.playerId}) starting game...`);
    firstClient.send({ type: 'START_GAME', cardsPerPlayer: 5 });
    console.log(`START_GAME sent. Playing ${rounds} round${rounds > 1 ? 's' : ''}...`);

    // Wait for all rounds to complete, then stop
    const timeout = new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error('startAutonomous timed out')), 5 * 60 * 1000)
    );
    await Promise.race([done, timeout]).finally(() => this.stop());
  }

  stop(): void {
    for (const bot of this.bots) {
      bot.client.close();
    }
    this.bots = [];
    console.log('All bots disconnected.');
  }
}
