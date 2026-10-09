import type { Server } from 'node:http';
import { decode } from '@saari/protocol';
import { WebSocket, WebSocketServer, type RawData } from 'ws';
import type { Hub } from './hub.ts';
import type { Peer } from './session.ts';

export const WS_PATH = '/ws';
/** Client frames are small JSON intents. */
export const MAX_FRAME_BYTES = 4096;
/** A socket that misses one ping round is dropped (and its player marked disconnected). */
export const HEARTBEAT_MS = 30_000;

export interface WsOptions {
  heartbeatMs?: number;
  /** Per-connection message rate; extra frames are dropped. */
  messagesPerSecond?: number;
  burst?: number;
}

export interface WebSockets {
  readonly clients: number;
  close(): Promise<void>;
}

/** Token bucket per connection, so one misbehaving tab cannot flood the game. */
class Bucket {
  #tokens: number;
  #last = Date.now();
  readonly #rate: number;
  readonly #burst: number;

  constructor(rate: number, burst: number) {
    this.#rate = rate;
    this.#burst = burst;
    this.#tokens = burst;
  }

  take(): boolean {
    const now = Date.now();
    this.#tokens = Math.min(this.#burst, this.#tokens + ((now - this.#last) / 1000) * this.#rate);
    this.#last = now;
    if (this.#tokens < 1) return false;
    this.#tokens -= 1;
    return true;
  }
}

function text(data: RawData): string {
  if (Array.isArray(data)) return Buffer.concat(data).toString('utf8');
  return Buffer.from(data as ArrayBuffer).toString('utf8');
}

/** Serves the game protocol on /ws of `server`. */
export function attachWebSockets(server: Server, hub: Hub, options: WsOptions = {}): WebSockets {
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_FRAME_BYTES, perMessageDeflate: false });
  const alive = new WeakMap<WebSocket, boolean>();
  const rate = options.messagesPerSecond ?? 20;
  const burst = options.burst ?? 40;

  server.on('upgrade', (req, socket, head) => {
    const { pathname } = new URL(req.url ?? '/', 'http://localhost');
    if (pathname !== WS_PATH) {
      socket.end('HTTP/1.1 404 Not Found\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  });

  wss.on('connection', (ws: WebSocket) => {
    alive.set(ws, true);
    const peer: Peer = {
      send(message) {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
      },
      close() {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) ws.close(1000);
      },
    };
    const connection = hub.open(peer);
    const bucket = new Bucket(rate, burst);
    ws.on('message', (data, isBinary) => {
      if (isBinary || !bucket.take()) return;
      connection.receive(decode<{ t: string }>(text(data)));
    });
    ws.on('pong', () => alive.set(ws, true));
    ws.on('close', () => connection.closed());
    ws.on('error', () => ws.terminate());
  });

  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (alive.get(ws) === false) {
        ws.terminate();
        continue;
      }
      alive.set(ws, false);
      ws.ping();
    }
  }, options.heartbeatMs ?? HEARTBEAT_MS);
  heartbeat.unref();

  return {
    get clients() {
      return wss.clients.size;
    },
    close() {
      clearInterval(heartbeat);
      for (const ws of wss.clients) ws.terminate();
      return new Promise<void>((resolve) => wss.close(() => resolve()));
    },
  };
}
