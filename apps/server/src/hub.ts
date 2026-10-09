import {
  PROTOCOL_VERSION,
  type ClientMessage,
  type CreateGameResponse,
  type GameStatusResponse,
} from '@saari/protocol';
import type { GameParams } from '@saari/rules';
import type { Scheduler } from './clock.ts';
import { newJoinCode, newSecret, newSeed } from './ids.ts';
import {
  GameSession,
  timingFor,
  type DebriefSink,
  type Debriefing,
  type Naming,
  type Peer,
} from './session.ts';
import { parseClientMessage, type GameSettings } from './validate.ts';

/** Ended games and games nobody has touched are dropped after two hours. */
export const GAME_TTL_MS = 2 * 60 * 60 * 1000;
/** Wrong join codes or host tokens one connection may try before it is closed. */
export const MAX_WRONG_CODES = 10;
/** Live games kept in memory at most. */
export const MAX_GAMES = 500;

export class HubFullError extends Error {
  constructor() {
    super('too many live games');
  }
}

export interface HubOptions {
  scheduler: Scheduler;
  /** Divides every phase length (tests). */
  timeScale?: number;
  store: DebriefSink | null;
  random?: () => number;
  naming?: Naming;
  debriefing?: Debriefing;
  params?: GameParams;
  log?: (line: string) => void;
  maxGames?: number;
}

/** All live games, by join code. Everything here lives only in memory. */
export class Hub {
  readonly #options: HubOptions;
  readonly #sessions = new Map<string, GameSession>();
  readonly #log: (line: string) => void;

  constructor(options: HubOptions) {
    this.#options = options;
    this.#log = options.log ?? ((line) => console.log(line));
  }

  get size(): number {
    return this.#sessions.size;
  }

  get log(): (line: string) => void {
    return this.#log;
  }

  get now(): number {
    return this.#options.scheduler.now();
  }

  createGame(settings: GameSettings): CreateGameResponse {
    if (this.#sessions.size >= (this.#options.maxGames ?? MAX_GAMES)) {
      this.sweep();
      if (this.#sessions.size >= (this.#options.maxGames ?? MAX_GAMES)) throw new HubFullError();
    }
    const code = newJoinCode((c) => this.#sessions.has(c));
    const hostToken = newSecret();
    const o = this.#options;
    const session = new GameSession({
      code,
      hostToken,
      length: settings.length,
      actionSeconds: settings.actionSeconds,
      trial: settings.trial,
      scheduler: o.scheduler,
      timing: timingFor(settings.actionSeconds, o.timeScale ?? 1),
      seed: newSeed(),
      store: o.store,
      log: this.#log,
      ...(o.random ? { random: o.random } : {}),
      ...(o.naming ? { naming: o.naming } : {}),
      ...(o.debriefing ? { debriefing: o.debriefing } : {}),
      ...(o.params ? { params: o.params } : {}),
    });
    this.#sessions.set(code, session);
    return { code, hostToken };
  }

  session(code: string): GameSession | undefined {
    return this.#sessions.get(code);
  }

  status(code: string): GameStatusResponse {
    return this.#sessions.get(code)?.status() ?? { exists: false, joinOpen: false, phase: null };
  }

  open(peer: Peer): Connection {
    return new Connection(this, peer);
  }

  /** Drops games that ended or have been idle for GAME_TTL_MS; returns how many. */
  sweep(): number {
    const now = this.now;
    let dropped = 0;
    for (const [code, session] of this.#sessions) {
      const endedAt = session.endedAt;
      const expired = endedAt !== null ? now - endedAt >= GAME_TTL_MS : now - session.lastActivity >= GAME_TTL_MS;
      if (expired) {
        session.dispose();
        this.#sessions.delete(code);
        dropped += 1;
      }
    }
    return dropped;
  }

  dispose(): void {
    for (const session of this.#sessions.values()) session.dispose();
    this.#sessions.clear();
  }
}

/** One WebSocket: the hello handshake, then messages to its game. */
export class Connection {
  readonly #hub: Hub;
  readonly #peer: Peer;
  #session: GameSession | null = null;
  #wrongCodes = 0;
  #closed = false;

  constructor(hub: Hub, peer: Peer) {
    this.#hub = hub;
    this.#peer = peer;
  }

  receive(value: unknown): void {
    if (this.#closed) return;
    const message = parseClientMessage(value);
    if (!message) {
      this.#peer.send({ t: 'error', code: 'bad-message' });
      return;
    }
    try {
      this.#dispatch(message);
    } catch (error) {
      // Never let one bad message take the server down. The message has no nicknames.
      this.#hub.log(`internal error: ${error instanceof Error ? error.message : String(error)}`);
      this.#peer.send({ t: 'error', code: 'server-error' });
    }
  }

  /** The socket closed. */
  closed(): void {
    if (this.#closed) return;
    this.#closed = true;
    this.#session?.disconnect(this.#peer);
    this.#session = null;
  }

  #dispatch(message: ClientMessage): void {
    if (message.t === 'ping') {
      this.#peer.send({ t: 'pong', serverTime: this.#hub.now });
      return;
    }
    if (message.t === 'hello-host' || message.t === 'hello-player') {
      this.#hello(message);
      return;
    }
    if (!this.#session) {
      this.#peer.send({ t: 'error', code: 'not-joined' });
      return;
    }
    this.#session.handle(this.#peer, message);
  }

  #hello(message: Extract<ClientMessage, { t: 'hello-host' | 'hello-player' }>): void {
    if (this.#session) {
      this.#peer.send({ t: 'error', code: 'already-joined' });
      return;
    }
    if (message.protocol !== PROTOCOL_VERSION) {
      this.#peer.send({ t: 'refused-join', reason: 'protocol-mismatch' });
      return;
    }
    const session = this.#hub.session(message.code);
    if (!session) {
      this.#peer.send({ t: 'refused-join', reason: 'unknown-game' });
      this.#wrongGuess();
      return;
    }
    if (message.t === 'hello-host') {
      if (session.connectHost(this.#peer, message.hostToken)) this.#session = session;
      else this.#wrongGuess();
      return;
    }
    const hello = {
      ...(message.nickname !== undefined ? { nickname: message.nickname } : {}),
      ...(message.playerToken !== undefined ? { playerToken: message.playerToken } : {}),
    };
    if (session.joinPlayer(this.#peer, hello) === null) this.#session = session;
  }

  /** Too many wrong codes or host tokens on one connection: hang up. */
  #wrongGuess(): void {
    this.#wrongCodes += 1;
    if (this.#wrongCodes >= MAX_WRONG_CODES) {
      this.#peer.close();
      this.closed();
    }
  }
}
