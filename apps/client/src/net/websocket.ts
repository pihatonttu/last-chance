import { decode, encode, type ClientMessage, type ServerMessage } from '@saari/protocol';
import type { ConnectionStatus } from '../state/reducer.ts';
import { Listeners, type Transport } from './transport.ts';

export interface WebSocketTransportOptions {
  /** Defaults to same-origin /ws (proxied by Vite in development). */
  url?: string;
  minDelayMs?: number;
  maxDelayMs?: number;
  /** Keep-alive and clock sync; 0 disables. */
  pingMs?: number;
}

export function defaultSocketUrl(): string {
  const { protocol, host } = globalThis.location;
  return `${protocol === 'https:' ? 'wss:' : 'ws:'}//${host}/ws`;
}

/** Reconnect delay: exponential backoff with jitter, capped. */
export function backoffDelay(attempt: number, minMs: number, maxMs: number, random: () => number = Math.random): number {
  const base = Math.min(maxMs, minMs * 2 ** attempt);
  return Math.round(base * (0.5 + random() * 0.5));
}

export class WebSocketTransport implements Transport {
  readonly #url: string;
  readonly #minDelay: number;
  readonly #maxDelay: number;
  readonly #pingMs: number;
  readonly #messages = new Listeners<ServerMessage>();
  readonly #statuses = new Listeners<ConnectionStatus>();
  #socket: WebSocket | null = null;
  #closed = false;
  #opened = false;
  #attempt = 0;
  #retryTimer: ReturnType<typeof setTimeout> | null = null;
  #pingTimer: ReturnType<typeof setInterval> | null = null;
  readonly #onOnline = () => this.#retryNow();
  readonly #onVisible = () => {
    if (globalThis.document?.visibilityState === 'visible') this.#retryNow();
  };

  constructor(options: WebSocketTransportOptions = {}) {
    this.#url = options.url ?? defaultSocketUrl();
    this.#minDelay = options.minDelayMs ?? 500;
    this.#maxDelay = options.maxDelayMs ?? 8000;
    this.#pingMs = options.pingMs ?? 20000;
  }

  connect(): void {
    this.#closed = false;
    globalThis.addEventListener?.('online', this.#onOnline);
    globalThis.document?.addEventListener('visibilitychange', this.#onVisible);
    this.#open();
  }

  send(message: ClientMessage): boolean {
    const socket = this.#socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(encode(message));
    return true;
  }

  close(): void {
    this.#closed = true;
    this.#clearTimers();
    globalThis.removeEventListener?.('online', this.#onOnline);
    globalThis.document?.removeEventListener('visibilitychange', this.#onVisible);
    const socket = this.#socket;
    this.#socket = null;
    if (socket && socket.readyState <= WebSocket.OPEN) socket.close(1000);
    this.#statuses.emit('closed');
  }

  onMessage(listener: (message: ServerMessage) => void): () => void {
    return this.#messages.add(listener);
  }

  onStatus(listener: (status: ConnectionStatus) => void): () => void {
    return this.#statuses.add(listener);
  }

  #open(): void {
    if (this.#closed) return;
    this.#statuses.emit(this.#opened ? 'reconnecting' : 'connecting');
    let socket: WebSocket;
    try {
      socket = new WebSocket(this.#url);
    } catch {
      this.#scheduleRetry();
      return;
    }
    this.#socket = socket;
    socket.onopen = () => {
      if (socket !== this.#socket) return;
      this.#attempt = 0;
      this.#opened = true;
      this.#statuses.emit('open');
      this.#startPing();
    };
    socket.onmessage = (event: MessageEvent) => {
      if (socket !== this.#socket || typeof event.data !== 'string') return;
      const message = decode<ServerMessage>(event.data);
      if (message) this.#messages.emit(message);
    };
    socket.onclose = () => {
      if (socket !== this.#socket) return;
      this.#socket = null;
      this.#stopPing();
      if (!this.#closed) this.#scheduleRetry();
    };
    // An error is always followed by close; nothing to do here.
    socket.onerror = () => undefined;
  }

  #scheduleRetry(): void {
    if (this.#closed || this.#retryTimer !== null) return;
    const delay = backoffDelay(this.#attempt, this.#minDelay, this.#maxDelay);
    this.#attempt += 1;
    this.#statuses.emit(this.#opened ? 'reconnecting' : 'connecting');
    this.#retryTimer = setTimeout(() => {
      this.#retryTimer = null;
      this.#open();
    }, delay);
  }

  /** Back online or tab visible again: skip the remaining backoff. */
  #retryNow(): void {
    if (this.#closed || this.#retryTimer === null) return;
    clearTimeout(this.#retryTimer);
    this.#retryTimer = null;
    this.#open();
  }

  #startPing(): void {
    this.#stopPing();
    if (this.#pingMs > 0) this.#pingTimer = setInterval(() => this.send({ t: 'ping' }), this.#pingMs);
  }

  #stopPing(): void {
    if (this.#pingTimer !== null) clearInterval(this.#pingTimer);
    this.#pingTimer = null;
  }

  #clearTimers(): void {
    if (this.#retryTimer !== null) clearTimeout(this.#retryTimer);
    this.#retryTimer = null;
    this.#stopPing();
  }
}
