import WebSocket from 'ws';
import type { ClientMessage, ServerMessage } from '@hafte-kasif/shared';

type MessageHandler = (msg: ServerMessage) => void;

export class BotClient {
  private ws: WebSocket | null = null;
  private handlers: MessageHandler[] = [];
  private pendingWaiters: Array<(err: Error) => void> = [];
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);
      this.ws.on('open', () => {
        console.log(`[${this.name}] Connected`);
        resolve();
      });
      this.ws.on('message', (data) => {
        try {
          const msg: ServerMessage = JSON.parse(data.toString());
          for (const handler of this.handlers) {
            handler(msg);
          }
        } catch (err) {
          console.error(`[${this.name}] Message handling error:`, err);
        }
      });
      this.ws.on('error', (err) => {
        console.error(`[${this.name}] WS error:`, err.message);
        reject(err);
      });
      this.ws.on('close', () => {
        console.log(`[${this.name}] Disconnected`);
        const err = new Error(`[${this.name}] WebSocket closed`);
        for (const reject of this.pendingWaiters) {
          reject(err);
        }
        this.pendingWaiters = [];
        this.handlers = [];
      });
    });
  }

  get connected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  send(msg: ClientMessage): void {
    if (!this.connected) {
      console.warn(`[${this.name}] Skipping send — WebSocket not connected`);
      return;
    }
    this.ws!.send(JSON.stringify(msg));
  }

  onMessage(handler: MessageHandler): void {
    this.handlers.push(handler);
  }

  waitFor<T extends ServerMessage['type']>(
    type: T,
    timeoutMs: number = 5000,
  ): Promise<Extract<ServerMessage, { type: T }>> {
    return new Promise((resolve, reject) => {
      const handler = (msg: ServerMessage) => {
        if (msg.type === type) {
          clearTimeout(timer);
          this.handlers = this.handlers.filter((h) => h !== handler);
          this.pendingWaiters = this.pendingWaiters.filter((r) => r !== reject);
          resolve(msg as Extract<ServerMessage, { type: T }>);
        }
      };

      const timer = setTimeout(() => {
        this.handlers = this.handlers.filter((h) => h !== handler);
        this.pendingWaiters = this.pendingWaiters.filter((r) => r !== reject);
        reject(new Error(`[${this.name}] Timeout waiting for ${type}`));
      }, timeoutMs);

      this.handlers.push(handler);
      this.pendingWaiters.push(reject);
    });
  }

  close(): void {
    this.ws?.close();
    this.ws = null;
    this.pendingWaiters = [];
    this.handlers = [];
  }
}
