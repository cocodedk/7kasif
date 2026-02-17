import { BotClient } from './bot-client.js';
import { createBotCredentials, type BotCredentials } from './bot-auth.js';
import { decideAction } from './bot-brain.js';
import { GameLogger } from './game-logger.js';
import type { PlayerView, ServerMessage, Card, Action } from '@hafte-kasif/shared';

function cardKey(c: Card): string {
  return `${c.value}:${c.suit}`;
}

interface BotInstance {
  credentials: BotCredentials;
  client: BotClient;
  playerId: string;
  hasDrawnThisTurn: boolean;
  hasAnnounced: boolean;
  rejectedCards: Set<string>;
}

export class BotRunner {
  private bots: BotInstance[] = [];
  private serverUrl: string;
  private logger: GameLogger | null = null;

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
        hasDrawnThisTurn: false,
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

        // Reset draw tracking when turn changes (but not during seven-penalty)
        if (view.currentPlayerId !== lastCurrentPlayer) {
          if (view.pendingEffect?.type !== 'seven-penalty') {
            bot.hasDrawnThisTurn = false;
          }
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
        const delay = 300 + Math.random() * 500;
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

          const action = decideAction(view, bot.playerId, bot.hasDrawnThisTurn, bot.rejectedCards);
          if (!action) return;

          if (action.type === 'DRAW_CARD') {
            bot.hasDrawnThisTurn = true;
          }
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

        // Track the last attempted card as rejected so we don't retry it
        if (lastAttemptedCard) {
          bot.rejectedCards.add(cardKey(lastAttemptedCard));
          lastAttemptedCard = null;
          // Re-evaluate with the rejected card excluded
          const retry = decideAction(lastView, bot.playerId, bot.hasDrawnThisTurn, bot.rejectedCards);
          if (retry) {
            if (retry.type === 'DRAW_CARD') bot.hasDrawnThisTurn = true;
            if (retry.type === 'PLAY_CARD') lastAttemptedCard = retry.card;
            lastAttemptedAction = retry;
            console.log(`[${bot.credentials.displayName}] Retry: ${retry.type}`,
              retry.type === 'PLAY_CARD' ? `${retry.card.value} of ${retry.card.suit}` : '');
            logger?.logAction(bot.credentials.displayName, bot.playerId, retry);
            bot.client.send({ type: 'PLAYER_ACTION', action: retry });
          }
        }
      }

      if (msg.type === 'GAME_OVER') {
        console.log(
          `[${bot.credentials.displayName}] Game over! Winner: ${msg.winnerId}, Points: ${msg.points}`,
        );
        logger?.logGameOver(msg);
        if (logger) {
          console.log(`Game log: ${logger.filePath}`);
        }
      }
    });
  }

  async startAutonomous(): Promise<void> {
    console.log('Creating bot credentials...');
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
      hasDrawnThisTurn: false,
      rejectedCards: new Set(),
    };
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
        hasDrawnThisTurn: false,
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

    // First bot starts the game
    console.log(`All bots joined. ${firstCred.displayName} (${firstBot.playerId}) starting game...`);
    firstClient.send({ type: 'START_GAME', cardsPerPlayer: 5 });
    console.log('START_GAME sent. Waiting for game...');
  }

  stop(): void {
    for (const bot of this.bots) {
      bot.client.close();
    }
    this.bots = [];
    console.log('All bots disconnected.');
  }
}
