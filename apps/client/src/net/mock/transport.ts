import type { ClientMessage, ServerMessage } from '@saari/protocol';
import type { ConnectionStatus } from '../../state/reducer.ts';
import { Listeners, type Transport } from '../transport.ts';
import type { Endpoint } from './hub.ts';
import type { MockConnection } from './server.ts';

async function loadEndpoint(code: string): Promise<Endpoint> {
  return (await import('./hub.ts')).resolveEndpoint(code);
}

/** A Transport to the in-browser MockServer (this tab's or another tab's, see hub.ts). */
export class MockTransport implements Transport {
  readonly #code: string;
  readonly #resolve: (code: string) => Promise<Endpoint>;
  readonly #messages = new Listeners<ServerMessage>();
  readonly #statuses = new Listeners<ConnectionStatus>();
  #conn: MockConnection | null = null;
  #closed = false;
  #opened = false;

  constructor(code: string, resolve: (code: string) => Promise<Endpoint> = loadEndpoint) {
    this.#code = code;
    this.#resolve = resolve;
  }

  connect(): void {
    this.#closed = false;
    this.#statuses.emit(this.#opened ? 'reconnecting' : 'connecting');
    void this.#resolve(this.#code).then((endpoint) => {
      if (this.#closed) return;
      this.#conn = endpoint.connect(
        (message) => {
          if (!this.#closed) this.#messages.emit(message);
        },
        () => this.#lost(),
      );
      this.#opened = true;
      this.#statuses.emit('open');
    });
  }

  send(message: ClientMessage): boolean {
    if (!this.#conn || this.#closed) return false;
    this.#conn.send(message);
    return true;
  }

  close(): void {
    this.#closed = true;
    this.#conn?.close();
    this.#conn = null;
    this.#statuses.emit('closed');
  }

  onMessage(listener: (message: ServerMessage) => void): () => void {
    return this.#messages.add(listener);
  }

  onStatus(listener: (status: ConnectionStatus) => void): () => void {
    return this.#statuses.add(listener);
  }

  /** The tab that owned the game went away: look for it again (or start a local demo). */
  #lost(): void {
    this.#conn = null;
    if (this.#closed) return;
    this.#statuses.emit('reconnecting');
    setTimeout(() => {
      if (!this.#closed) this.connect();
    }, 1000);
  }
}
