import WebSocket from 'ws';
import type { ClientMessage, ServerMessage } from '@hafte-kasif/shared';

type MessageHandler = (msg: ServerMessage) => void;

export class BotClient {
  private ws: WebSocket | null = null;
  private handlers: MessageHandler[] = [];
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
        const msg: ServerMessage = JSON.parse(data.toString());
        for (const handler of this.handlers) {
          handler(msg);
        }
      });
      this.ws.on('error', (err) => {
        console.error(`[${this.name}] WS error:`, err.message);
        reject(err);
      });
      this.ws.on('close', () => {
        console.log(`[${this.name}] Disconnected`);
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
      const timer = setTimeout(() => {
        reject(new Error(`[${this.name}] Timeout waiting for ${type}`));
      }, timeoutMs);

      const handler = (msg: ServerMessage) => {
        if (msg.type === type) {
          clearTimeout(timer);
          this.handlers = this.handlers.filter((h) => h !== handler);
          resolve(msg as Extract<ServerMessage, { type: T }>);
        }
      };
      this.handlers.push(handler);
    });
  }

  close(): void {
    this.ws?.close();
    this.ws = null;
  }
}
