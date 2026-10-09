import { PROTOCOL_VERSION, type ClientMessage, type HostCommand, type ServerMessage } from '@saari/protocol';
import type { Transport } from '../net/transport.ts';
import { applyLocal, applyServerMessage, initialState, type ClientState, type LocalEvent } from './reducer.ts';

/** Join refusals after which reconnecting cannot help. */
const TERMINAL = new Set(['unknown-game', 'join-closed', 'game-ended', 'kicked', 'protocol-mismatch']);

export type Hello = () => ClientMessage | null;

/**
 * One page's connection to one game: the transport, the reducer state (as Svelte
 * state), and the intents the views send. The hello is sent again after every
 * reconnect, so a reload or a dropped Wi-Fi brings the student back (P23).
 */
export class GameSession {
  state: ClientState = $state.raw(initialState());
  readonly code: string;
  readonly #transport: Transport;
  readonly #hello: Hello;
  readonly #listeners = new Set<(message: ServerMessage, state: ClientState) => void>();
  #offs: (() => void)[] = [];
  #started = false;
  #stopped = false;

  constructor(code: string, transport: Transport, hello: Hello) {
    this.code = code;
    this.#transport = transport;
    this.#hello = hello;
  }

  get started(): boolean {
    return this.#started;
  }

  start(): void {
    if (this.#started) return;
    this.#started = true;
    this.#offs = [
      this.#transport.onStatus((status) => {
        this.#dispatch({ type: 'status', status });
        if (status === 'open') this.sendHello();
      }),
      this.#transport.onMessage((message) => this.#receive(message)),
    ];
    this.#transport.connect();
  }

  stop(): void {
    if (this.#stopped) return;
    this.#stopped = true;
    for (const off of this.#offs) off();
    this.#offs = [];
    this.#transport.close();
    this.#listeners.clear();
  }

  /** Called after each message is applied; for tokens, sounds and similar side effects. */
  onMessage(listener: (message: ServerMessage, state: ClientState) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  sendHello(): void {
    const hello = this.#hello();
    if (hello) this.#transport.send(hello);
  }

  send(message: ClientMessage): boolean {
    return this.#transport.send(message);
  }

  inspect(x: number, y: number): void {
    this.send({ t: 'inspect', x, y });
  }

  act(x: number, y: number): void {
    this.send({ t: 'act', x, y });
  }

  vote(option: string): void {
    this.#dispatch({ type: 'vote-sent', option });
    this.send({ t: 'vote', option });
  }

  host(command: HostCommand): void {
    this.send({ t: 'host', command });
  }

  clearRefusal(): void {
    this.#dispatch({ type: 'clear-refusal' });
  }

  clearError(): void {
    this.#dispatch({ type: 'clear-error' });
  }

  #dispatch(event: LocalEvent): void {
    this.state = applyLocal(this.state, event);
  }

  #receive(message: ServerMessage): void {
    this.state = applyServerMessage(this.state, message, Date.now());
    if (message.t === 'kicked' || (message.t === 'refused-join' && TERMINAL.has(message.reason))) {
      this.#transport.close();
    }
    for (const listener of [...this.#listeners]) listener(message, this.state);
  }
}

export function hostHello(code: string, hostToken: string): Hello {
  return () => ({ t: 'hello-host', protocol: PROTOCOL_VERSION, code, hostToken });
}
