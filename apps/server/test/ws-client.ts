import type { ClientMessage, ServerMessage } from '@saari/protocol';
import WebSocket from 'ws';

/** A test client over a real WebSocket that records every frame. */
export class Client {
  readonly frames: string[] = [];
  readonly messages: ServerMessage[] = [];
  onMessage: ((message: ServerMessage) => void) | null = null;
  readonly #waiters: { test: (m: ServerMessage) => boolean; resolve: (m: ServerMessage) => void }[] = [];
  readonly #closed: Promise<{ code: number }>;
  readonly ws: WebSocket;

  constructor(ws: WebSocket) {
    this.ws = ws;
    ws.on('message', (data) => this.#frame(String(data)));
    this.#closed = new Promise((resolve) => ws.on('close', (code) => resolve({ code })));
  }

  static open(url: string): Promise<Client> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      const client = new Client(ws);
      ws.once('open', () => resolve(client));
      ws.once('error', reject);
    });
  }

  send(message: ClientMessage): void {
    this.ws.send(JSON.stringify(message));
  }

  /** First message from index `from` on, already received or future, that passes `test`. */
  waitFor<T extends ServerMessage = ServerMessage>(
    test: (m: ServerMessage) => boolean,
    timeoutMs = 5_000,
    from = 0,
  ): Promise<T> {
    const seen = this.messages.slice(from).find(test);
    if (seen) return Promise.resolve(seen as T);
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`timed out after ${timeoutMs} ms`)), timeoutMs);
      this.#waiters.push({
        test,
        resolve: (m) => {
          clearTimeout(timer);
          resolve(m as T);
        },
      });
    });
  }

  closed(): Promise<{ code: number }> {
    return this.#closed;
  }

  close(): void {
    this.ws.close();
  }

  #frame(text: string): void {
    this.frames.push(text);
    const message = JSON.parse(text) as ServerMessage;
    this.messages.push(message);
    this.onMessage?.(message);
    for (let i = this.#waiters.length - 1; i >= 0; i--) {
      const waiter = this.#waiters[i]!;
      if (waiter.test(message)) {
        this.#waiters.splice(i, 1);
        waiter.resolve(message);
      }
    }
  }
}
