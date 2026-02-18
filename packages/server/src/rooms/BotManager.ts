import type { GameState, GameEvent, Action, ActionResult, Card, PlayerView } from '@hafte-kasif/shared';
import { applyAction } from '../engine/game.js';
import { decideAction } from '../engine/bot-brain.js';
import type { Room } from './RoomManager.js';

type LogActionFn = (playerId: string, action: Action, stateBefore: GameState, result: ActionResult) => void;

const BOT_NAMES = ['Alice', 'Bob', 'Charlie'];
const BOT_IDS = ['bot_1', 'bot_2', 'bot_3'];

interface BotState {
  hasAnnounced: boolean;
  rejectedCards: Set<string>;
  lastCurrentPlayer: string;
}

function cardKey(c: Card): string {
  return `${c.value}:${c.suit}`;
}

interface BotManagerOptions {
  actionDelayMs?: number;
}

export class BotManager {
  private actionDelayMs: number;
  /** Per-room bot state, keyed by `roomCode:botId` */
  private botStates = new Map<string, BotState>();
  /** Track which rooms have bots, for cleanup */
  private roomBots = new Map<string, Set<string>>();
  /** Active bot turn timers per room, to prevent overlapping chains */
  private activeTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(options: BotManagerOptions = {}) {
    this.actionDelayMs = options.actionDelayMs ?? 300;
  }

  static isBot(playerId: string): boolean {
    return playerId.startsWith('bot_');
  }

  addBots(room: Room, count: number): { id: string; name: string }[] {
    const added: { id: string; name: string }[] = [];
    const existingBotIds = new Set(room.players.filter(p => BotManager.isBot(p.id)).map(p => p.id));

    for (let i = 0; i < BOT_IDS.length && added.length < count; i++) {
      if (existingBotIds.has(BOT_IDS[i])) continue;
      if (room.players.length >= 4) break;

      const botId = BOT_IDS[i];
      const botName = BOT_NAMES[i];
      room.players.push({ id: botId, name: botName });
      added.push({ id: botId, name: botName });

      // Initialize bot state
      const stateKey = `${room.code}:${botId}`;
      this.botStates.set(stateKey, {
        hasAnnounced: false,
        rejectedCards: new Set(),
        lastCurrentPlayer: '',
      });

      // Track room bots
      if (!this.roomBots.has(room.code)) {
        this.roomBots.set(room.code, new Set());
      }
      this.roomBots.get(room.code)!.add(botId);
    }

    return added;
  }

  /**
   * Check if the current player is a bot and schedule their turn.
   * Call this after every broadcastGameState.
   */
  scheduleBotTurn(
    room: Room,
    getPlayerView: (state: GameState, playerId: string) => PlayerView,
    broadcastGameState: (roomCode: string, events?: GameEvent[], stateBefore?: GameState) => void,
    broadcastGameOver: (room: Room, events: GameEvent[], state: GameState) => void,
    logAction?: LogActionFn,
  ): void {
    if (!room.gameState) return;
    if (room.gameState.phase !== 'playing') return;

    const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
    if (!BotManager.isBot(currentPlayer.id)) return;

    // Clear any existing timer for this room
    const existingTimer = this.activeTimers.get(room.code);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(() => {
      this.activeTimers.delete(room.code);
      this.executeBotTurn(room, getPlayerView, broadcastGameState, broadcastGameOver, logAction);
    }, this.actionDelayMs);

    this.activeTimers.set(room.code, timer);
  }

  private executeBotTurn(
    room: Room,
    getPlayerView: (state: GameState, playerId: string) => PlayerView,
    broadcastGameState: (roomCode: string, events?: GameEvent[], stateBefore?: GameState) => void,
    broadcastGameOver: (room: Room, events: GameEvent[], state: GameState) => void,
    logAction?: LogActionFn,
  ): void {
    if (!room.gameState || room.gameState.phase !== 'playing') return;

    const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
    if (!BotManager.isBot(currentPlayer.id)) return;

    const botId = currentPlayer.id;
    const stateKey = `${room.code}:${botId}`;
    let botState = this.botStates.get(stateKey);
    if (!botState) {
      botState = { hasAnnounced: false, rejectedCards: new Set(), lastCurrentPlayer: '' };
      this.botStates.set(stateKey, botState);
    }

    // Reset rejected cards on turn change
    if (botState.lastCurrentPlayer !== botId) {
      botState.rejectedCards.clear();
      botState.lastCurrentPlayer = botId;
    }

    // Reset announce flag when hand size changes from 1
    const view = getPlayerView(room.gameState, botId);
    if (view.myHand.length !== 1) {
      botState.hasAnnounced = false;
    }

    // Announce one card if needed
    if (view.myHand.length === 1 && !botState.hasAnnounced) {
      botState.hasAnnounced = true;
      const announceAction: Action = { type: 'ANNOUNCE_ONE_CARD' };
      const stateBefore = room.gameState;
      const result = applyAction(room.gameState, botId, announceAction);
      logAction?.(botId, announceAction, stateBefore, result);
      if (result.ok) {
        room.gameState = result.newState;
        room.lastActivityAt = Date.now();
        broadcastGameState(room.code, result.events, stateBefore);
        // Continue — the bot still needs to play after announcing
        this.scheduleBotTurn(room, getPlayerView, broadcastGameState, broadcastGameOver, logAction);
        return;
      }
    }

    // Decide and play
    const action = decideAction(view, botId, view.hasDrawnThisTurn, botState.rejectedCards);
    if (!action) {
      // Bot brain couldn't decide — force a pass or draw to avoid stalling
      const fallback: Action = view.hasDrawnThisTurn
        ? { type: 'PASS_TURN' }
        : { type: 'DRAW_CARD' };
      const fbStateBefore = room.gameState!;
      const fbResult = applyAction(fbStateBefore, botId, fallback);
      logAction?.(botId, fallback, fbStateBefore, fbResult);
      if (fbResult.ok) {
        room.gameState = fbResult.newState;
        room.lastActivityAt = Date.now();
        broadcastGameState(room.code, fbResult.events, fbStateBefore);
        this.scheduleBotTurn(room, getPlayerView, broadcastGameState, broadcastGameOver, logAction);
      }
      return;
    }

    const stateBefore = room.gameState;
    const result = applyAction(room.gameState, botId, action);

    logAction?.(botId, action, stateBefore, result);

    if (!result.ok) {
      // Track rejected action and retry
      if (action.type === 'PLAY_CARD') {
        botState.rejectedCards.add(cardKey(action.card));
      } else {
        // Non-card rejection (e.g. DRAW_CARD, PASS_TURN) — fall back to avoid infinite retry
        const fallback: Action = action.type === 'DRAW_CARD'
          ? { type: 'PASS_TURN' }
          : { type: 'DRAW_CARD' };
        const fbStateBefore = room.gameState!;
        const fbResult = applyAction(fbStateBefore, botId, fallback);
        logAction?.(botId, fallback, fbStateBefore, fbResult);
        if (fbResult.ok) {
          room.gameState = fbResult.newState;
          room.lastActivityAt = Date.now();
          broadcastGameState(room.code, fbResult.events, fbStateBefore);
        }
      }
      this.scheduleBotTurn(room, getPlayerView, broadcastGameState, broadcastGameOver, logAction);
      return;
    }

    room.gameState = result.newState;
    room.lastActivityAt = Date.now();

    // Check for game over
    const gameOverEvent = result.events.find(e => e.type === 'GAME_OVER');
    if (gameOverEvent) {
      broadcastGameState(room.code, result.events, stateBefore);
      broadcastGameOver(room, result.events, result.newState);
      return;
    }

    broadcastGameState(room.code, result.events, stateBefore);

    // Chain: schedule next bot turn if next player is also a bot
    this.scheduleBotTurn(room, getPlayerView, broadcastGameState, broadcastGameOver, logAction);
  }

  /** Reset bot states for a room (call when starting a new round) */
  resetRoomBotStates(roomCode: string): void {
    const bots = this.roomBots.get(roomCode);
    if (!bots) return;
    for (const botId of bots) {
      const stateKey = `${roomCode}:${botId}`;
      this.botStates.set(stateKey, {
        hasAnnounced: false,
        rejectedCards: new Set(),
        lastCurrentPlayer: '',
      });
    }
  }

  /**
   * Remove bot timers and state for rooms that no longer exist.
   * Call after RoomManager.cleanup() so deleted rooms get purged here too.
   */
  cleanup(liveRoomCodes: Set<string>): void {
    for (const roomCode of [...this.roomBots.keys()]) {
      if (!liveRoomCodes.has(roomCode)) {
        this.cleanupRoom(roomCode);
      }
    }
  }

  /** Simple cleanup: remove all tracking for a specific room */
  cleanupRoom(roomCode: string): void {
    const bots = this.roomBots.get(roomCode);
    if (!bots) return;

    const timer = this.activeTimers.get(roomCode);
    if (timer) {
      clearTimeout(timer);
      this.activeTimers.delete(roomCode);
    }

    for (const botId of bots) {
      this.botStates.delete(`${roomCode}:${botId}`);
    }
    this.roomBots.delete(roomCode);
  }
}
