import type { ClientMessage, ServerMessage } from '@saari/protocol';
import type { ConnectionStatus } from '../state/reducer.ts';

/**
 * One connection to a game. The session sends `hello-*` itself on every 'open', so a
 * transport only moves frames and reconnects.
 */
export interface Transport {
  connect(): void;
  /** Returns false when the message could not be sent (not connected). */
  send(message: ClientMessage): boolean;
  /** Closes for good: no more reconnects. */
  close(): void;
  onMessage(listener: (message: ServerMessage) => void): () => void;
  onStatus(listener: (status: ConnectionStatus) => void): () => void;
}

/** Small listener set shared by the transports. */
export class Listeners<T> {
  #items = new Set<(value: T) => void>();

  add(listener: (value: T) => void): () => void {
    this.#items.add(listener);
    return () => this.#items.delete(listener);
  }

  emit(value: T): void {
    for (const listener of [...this.#items]) listener(value);
  }

  clear(): void {
    this.#items.clear();
  }
}
