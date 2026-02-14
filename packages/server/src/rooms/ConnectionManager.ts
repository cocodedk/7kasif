import type { WebSocket } from 'ws';

interface Connection {
  ws: WebSocket;
  playerId: string;
  roomCode: string | null;
  playerName: string;
  disconnectedAt: number | null;
}

const RECONNECT_GRACE_MS = 60_000;

export class ConnectionManager {
  private connections = new Map<string, Connection>();
  private wsToPlayer = new Map<WebSocket, string>();

  add(ws: WebSocket, playerId: string, playerName: string): void {
    const existing = this.connections.get(playerId);
    if (existing?.ws) {
      // Close old connection
      try { existing.ws.close(); } catch {}
      this.wsToPlayer.delete(existing.ws);
    }

    this.connections.set(playerId, {
      ws,
      playerId,
      roomCode: existing?.roomCode ?? null,
      playerName,
      disconnectedAt: null,
    });
    this.wsToPlayer.set(ws, playerId);
  }

  remove(ws: WebSocket): string | null {
    const playerId = this.wsToPlayer.get(ws);
    if (!playerId) return null;

    this.wsToPlayer.delete(ws);

    const conn = this.connections.get(playerId);
    if (conn) {
      conn.disconnectedAt = Date.now();
      conn.ws = null as any;
    }

    return playerId;
  }

  getConnection(playerId: string): Connection | undefined {
    return this.connections.get(playerId);
  }

  getPlayerIdByWs(ws: WebSocket): string | null {
    return this.wsToPlayer.get(ws) ?? null;
  }

  setRoom(playerId: string, roomCode: string): void {
    const conn = this.connections.get(playerId);
    if (conn) conn.roomCode = roomCode;
  }

  isConnected(playerId: string): boolean {
    const conn = this.connections.get(playerId);
    if (!conn) return false;
    if (conn.ws && conn.ws.readyState === 1) return true;
    return false;
  }

  isWithinGracePeriod(playerId: string): boolean {
    const conn = this.connections.get(playerId);
    if (!conn || !conn.disconnectedAt) return false;
    return Date.now() - conn.disconnectedAt < RECONNECT_GRACE_MS;
  }

  send(playerId: string, message: object): void {
    const conn = this.connections.get(playerId);
    if (conn?.ws && conn.ws.readyState === 1) {
      conn.ws.send(JSON.stringify(message));
    }
  }

  reconnect(ws: WebSocket, playerId: string): boolean {
    const conn = this.connections.get(playerId);
    if (!conn) return false;
    if (!this.isWithinGracePeriod(playerId)) return false;

    // Clean up old ws mapping
    if (conn.ws) {
      this.wsToPlayer.delete(conn.ws);
    }

    conn.ws = ws;
    conn.disconnectedAt = null;
    this.wsToPlayer.set(ws, playerId);
    return true;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [playerId, conn] of this.connections) {
      if (conn.disconnectedAt && now - conn.disconnectedAt > RECONNECT_GRACE_MS) {
        this.connections.delete(playerId);
      }
    }
  }
}
