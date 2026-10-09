/**
 * An in-browser stand-in for the game server, used with ?mock=1. It runs the real
 * rules engine (@saari/rules) and real bots (@saari/bots) and speaks the same
 * protocol, so every view can be developed and demoed without apps/server.
 *
 * It follows docs/04-pelisuunnittelu.md §4 (phases, early ends, +30 s, pause) and the
 * protocol comments. It is a development tool, not the reference server: where the
 * protocol leaves something open, the choice made here is noted in a comment.
 */
import { createBot, type Bot, type Strategy } from '@saari/bots';
import { buildDebrief, pseudonymize, type DebriefData, type DebriefLabel } from '@saari/debrief';
import {
  PROTOCOL_VERSION,
  type ClientMessage,
  type CreateGameRequest,
  type CreateGameResponse,
  type GameStatusResponse,
  type GameView,
  type HostCommand,
  type JoinRefusal,
  type PlayerSummary,
  type ServerMessage,
  type TickerEvent,
  type TimerView,
  type VillageView,
  type VoteView,
  type YouView,
} from '@saari/protocol';
import { createGame, createRng, type Game, type GameLength, type LogEntry, type Phase, type PublicTile, type Rng } from '@saari/rules';
import { checkNickname, playerColor, randomNickname } from '../../lib/names.ts';
import { fallbackDebrief, fallbackPseudonymize } from './debrief-fallback.ts';

export interface Scheduler {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

/** Uses the globals at call time, so Vitest fake timers apply. */
export const realScheduler: Scheduler = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export interface MockServerOptions {
  scheduler?: Scheduler;
  seed?: number;
  /** Divides every phase length and bot delay; the demo panel changes it. */
  speed?: number;
  voteSeconds?: number;
  summarySeconds?: number;
  /** Delay after everyone has voted before the vote closes (design doc §4: +3 s). */
  voteGraceMs?: number;
  /** Delay between two bot moves. */
  botStepMs?: number;
  /** Bots that join a trial game (P19: ~20). */
  trialBots?: number;
  /** Bots that trickle into a normal mock game to stand in for a class. */
  demoBots?: number;
  /** Unknown codes create a demo game instead of 'unknown-game'. */
  autoCreate?: boolean;
}

export type MockSink = (message: ServerMessage) => void;

export interface MockConnection {
  send(message: ClientMessage): void;
  close(): void;
}

interface Seat {
  id: string;
  nickname: string;
  color: string;
  token: string;
  bot: Bot | null;
  nameLocked: boolean;
  removed: boolean;
  /** Bot found nothing more to do in this action phase. */
  idle: boolean;
}

interface Conn {
  sink: MockSink;
  role: 'host' | 'player' | null;
  playerId: string | null;
  open: boolean;
  queue: ServerMessage[];
  flushing: boolean;
}

const BOT_MIX: readonly Strategy[] = [
  'cooperative',
  'cooperative',
  'cooperative',
  'random',
  'cooperative',
  'cooperative',
  'lazy',
  'cooperative',
  'selfish',
  'cooperative',
];

function randomHex(rng: Rng, length: number): string {
  let out = '';
  while (out.length < length) out += Math.floor(rng.next() * 0x100000000).toString(16).padStart(8, '0');
  return out.slice(0, length);
}

class Room {
  readonly code: string;
  hostToken: string;
  readonly length: GameLength;
  readonly actionSeconds: number;
  readonly trial: boolean;
  /** Starts by itself a few seconds after the first student joins (student-only demo). */
  autoStart = false;
  endedEarly = false;
  readonly game: Game;
  readonly seats = new Map<string, Seat>();
  readonly conns = new Set<Conn>();
  /** Who voted what this month; the engine keeps votes private. */
  readonly voters = new Map<string, string | null>();
  namesHidden = false;
  endsAt: number | null = null;
  remainingMs = 0;
  /** Length of the running phase incl. extensions (TimerView.phaseMs). */
  phaseMs = 0;
  paused = false;
  phaseTimer: unknown = null;
  graceTimer: unknown = null;
  botTimer: unknown = null;
  pendingBots = 0;
  tileCache: string[] = [];
  storedToken: string | null = null;
  debrief: DebriefData | null = null;
  started = false;

  constructor(code: string, hostToken: string, request: CreateGameRequest, seed: number, clock: () => number) {
    this.code = code;
    this.hostToken = hostToken;
    this.length = request.length;
    this.actionSeconds = request.actionSeconds ?? 60;
    this.trial = request.trial ?? false;
    this.game = createGame({ seed, length: request.length, clock });
  }
}

export class MockServer {
  readonly #scheduler: Scheduler;
  readonly #rng: Rng;
  readonly #rooms = new Map<string, Room>();
  readonly #stored = new Map<string, DebriefData>();
  readonly #options: Required<Omit<MockServerOptions, 'scheduler' | 'seed' | 'speed'>>;
  #speed: number;
  #playerSeq = 0;
  readonly #roomListeners = new Set<() => void>();
  readonly #pendingTicker = new Map<Room, TickerEvent[]>();

  constructor(options: MockServerOptions = {}) {
    this.#scheduler = options.scheduler ?? realScheduler;
    this.#rng = createRng(options.seed ?? (Math.floor(Math.random() * 0x7fffffff) >>> 0));
    this.#speed = options.speed ?? 1;
    this.#options = {
      voteSeconds: options.voteSeconds ?? 30,
      summarySeconds: options.summarySeconds ?? 8,
      voteGraceMs: options.voteGraceMs ?? 3000,
      botStepMs: options.botStepMs ?? 450,
      trialBots: options.trialBots ?? 20,
      demoBots: options.demoBots ?? 11,
      autoCreate: options.autoCreate ?? true,
    };
  }

  // ---------------------------------------------------------------- HTTP equivalents

  createGame(request: CreateGameRequest, code?: string, hostToken?: string): CreateGameResponse {
    const finalCode = code ?? this.#newCode();
    const token = hostToken ?? randomHex(this.#rng, 32);
    const seed = Math.floor(this.#rng.next() * 0x7fffffff);
    const room = new Room(finalCode, token, request, seed, () => this.#now());
    this.#rooms.set(finalCode, room);
    if (room.trial) for (let i = 0; i < this.#options.trialBots; i++) this.#addBot(room);
    else room.pendingBots = this.#options.demoBots;
    this.#scheduleBots(room);
    this.#notifyRooms();
    return { code: finalCode, hostToken: token };
  }

  status(code: string): GameStatusResponse {
    const room = this.#rooms.get(code);
    if (!room) return this.#options.autoCreate ? { exists: true, joinOpen: true, phase: 'lobby' } : { exists: false, joinOpen: false, phase: null };
    return { exists: true, joinOpen: this.#joinOpen(room), phase: room.game.phase };
  }

  getDebrief(token: string): DebriefData | null {
    return this.#stored.get(token) ?? null;
  }

  deleteDebrief(token: string): boolean {
    return this.#stored.delete(token);
  }

  hasRoom(code: string): boolean {
    return this.#rooms.has(code);
  }

  roomCodes(): string[] {
    return [...this.#rooms.keys()];
  }

  onRoomsChanged(listener: () => void): () => void {
    this.#roomListeners.add(listener);
    return () => this.#roomListeners.delete(listener);
  }

  // ---------------------------------------------------------------- connections

  connect(sink: MockSink): MockConnection {
    const conn: Conn = { sink, role: null, playerId: null, open: true, queue: [], flushing: false };
    return {
      send: (message) => {
        if (conn.open) this.#receive(conn, message);
      },
      close: () => this.#disconnect(conn),
    };
  }

  // ---------------------------------------------------------------- demo controls

  get speed(): number {
    return this.#speed;
  }

  setSpeed(speed: number): void {
    const next = Math.max(0.25, Math.min(20, speed));
    for (const room of this.#rooms.values()) {
      if (room.endsAt !== null && !room.paused) {
        const left = Math.max(0, room.endsAt - this.#now());
        room.phaseMs = (room.phaseMs * this.#speed) / next;
        this.#armPhaseTimer(room, (left * this.#speed) / next);
      }
    }
    this.#speed = next;
    for (const room of this.#rooms.values()) this.#broadcastTimer(room);
  }

  /** Ends the current phase now (lobby: starts the game). */
  skipPhase(code: string): void {
    const room = this.#rooms.get(code);
    if (!room) return;
    if (room.game.phase === 'lobby') this.#start(room);
    else this.#advance(room);
  }

  addBots(code: string, count: number): void {
    const room = this.#rooms.get(code);
    if (!room || room.game.phase === 'ended') return;
    for (let i = 0; i < count; i++) {
      if (!this.#addBot(room)) break;
    }
    this.#broadcastPlayers(room);
  }

  phaseOf(code: string): { phase: string; month: number } | null {
    const room = this.#rooms.get(code);
    return room ? { phase: room.game.phase, month: room.game.month } : null;
  }

  // ---------------------------------------------------------------- receive

  #receive(conn: Conn, message: ClientMessage): void {
    switch (message.t) {
      case 'hello-host':
        return this.#helloHost(conn, message.protocol, message.code, message.hostToken);
      case 'hello-player':
        return this.#helloPlayer(conn, message.protocol, message.code, message.nickname, message.playerToken);
      case 'ping':
        return this.#send(conn, { t: 'pong', serverTime: this.#now() });
      default:
        break;
    }
    const room = this.#roomOf(conn);
    if (!room) return this.#send(conn, { t: 'error', code: 'not-joined' });
    switch (message.t) {
      case 'inspect':
        return this.#inspect(room, conn, message.x, message.y);
      case 'act':
        return this.#act(room, conn, message.x, message.y);
      case 'vote':
        return this.#vote(room, conn, message.option);
      case 'host':
        if (conn.role !== 'host') return this.#send(conn, { t: 'error', code: 'not-host' });
        return this.#host(room, message.command);
    }
  }

  #helloHost(conn: Conn, protocol: number, code: string, hostToken: string): void {
    if (protocol !== PROTOCOL_VERSION) return this.#refuse(conn, 'protocol-mismatch');
    let room = this.#rooms.get(code);
    if (!room && this.#options.autoCreate) {
      // A reload of /host/:code?mock=1 lost the in-memory game: start a fresh trial one.
      this.createGame({ length: 'normal', actionSeconds: 60, trial: true }, code, hostToken);
      room = this.#rooms.get(code);
    }
    if (!room) return this.#refuse(conn, 'unknown-game');
    if (room.hostToken !== hostToken) return this.#refuse(conn, 'bad-token');
    conn.role = 'host';
    conn.playerId = null;
    room.conns.add(conn);
    this.#send(conn, { t: 'welcome', role: 'host', game: this.#gameView(room, true), you: null, serverTime: this.#now() });
    // Choice: a host that reconnects after the end gets the named debrief again.
    if (room.debrief) this.#send(conn, { t: 'debrief', debrief: room.debrief, storedToken: room.storedToken });
  }

  #helloPlayer(conn: Conn, protocol: number, code: string, nickname?: string, playerToken?: string): void {
    if (protocol !== PROTOCOL_VERSION) return this.#refuse(conn, 'protocol-mismatch');
    let room = this.#rooms.get(code);
    if (!room && this.#options.autoCreate) room = this.#createDemoRoom(code);
    if (!room) return this.#refuse(conn, 'unknown-game');

    let seat: Seat | undefined;
    if (playerToken !== undefined) {
      seat = [...room.seats.values()].find((s) => s.token === playerToken);
      if (!seat) return this.#refuse(conn, 'bad-token');
      if (seat.removed) return this.#refuse(conn, 'kicked');
    } else {
      const check = checkNickname(nickname ?? '');
      if (!check.ok) return this.#refuse(conn, check.reason === 'offensive' ? 'nickname-offensive' : 'nickname-invalid');
      const lower = check.nickname.toLowerCase();
      const same = [...room.seats.values()].find((s) => s.nickname.toLowerCase() === lower);
      if (same) {
        if (same.removed) return this.#refuse(conn, 'kicked');
        // P23: the same nickname rejoins only when that player is disconnected.
        if (same.bot || this.#seatConnected(room, same.id)) return this.#refuse(conn, 'nickname-taken');
        seat = same;
      } else {
        if (room.game.phase === 'ended') return this.#refuse(conn, 'game-ended');
        const id = `p${++this.#playerSeq}`;
        const joined = room.game.addPlayer(id);
        if (!joined.ok) return this.#refuse(conn, joined.reason === 'game-ended' ? 'game-ended' : 'join-closed');
        seat = {
          id,
          nickname: check.nickname,
          color: playerColor(room.seats.size),
          token: randomHex(this.#rng, 32),
          bot: null,
          nameLocked: false,
          removed: false,
          idle: false,
        };
        room.seats.set(id, seat);
        if (room.started) this.#broadcastTicker(room, { kind: 'player-joined' });
        if (room.autoStart && !room.started && room.phaseTimer === null) {
          this.#armPhaseTimer(room, 4000 / this.#speed);
        }
      }
    }

    conn.role = 'player';
    conn.playerId = seat.id;
    room.conns.add(conn);
    room.game.setConnected(seat.id, true);
    this.#send(conn, {
      t: 'welcome',
      role: 'player',
      game: this.#gameView(room, false),
      you: this.#youView(room, seat),
      playerToken: seat.token,
      serverTime: this.#now(),
    });
    this.#broadcastPlayers(room);
  }

  #inspect(room: Room, conn: Conn, x: number, y: number): void {
    if (!conn.playerId) return;
    this.#send(conn, { t: 'preview', x, y, preview: room.game.preview(conn.playerId, x, y) });
  }

  #act(room: Room, conn: Conn, x: number, y: number): void {
    if (!conn.playerId) return;
    this.#perform(room, conn.playerId, x, y, conn);
  }

  #vote(room: Room, conn: Conn, option: string): void {
    if (!conn.playerId) return;
    const result = room.game.vote(conn.playerId, option);
    this.#send(conn, result.ok ? { t: 'vote-result', ok: true } : { t: 'vote-result', ok: false, reason: result.reason });
    if (!result.ok) return;
    room.voters.set(conn.playerId, option);
    this.#afterVote(room, conn.playerId);
  }

  #host(room: Room, command: HostCommand): void {
    const game = room.game;
    switch (command.type) {
      case 'start':
        return this.#start(room);
      case 'pause':
        if (room.paused || room.endsAt === null) return;
        game.logTeacher('pause');
        room.remainingMs = Math.max(0, room.endsAt - this.#now());
        room.endsAt = null;
        room.paused = true;
        this.#clearTimer(room, 'phaseTimer');
        this.#clearTimer(room, 'graceTimer');
        return this.#broadcastGame(room);
      case 'resume':
        if (!room.paused) return;
        game.logTeacher('resume');
        room.paused = false;
        this.#armPhaseTimer(room, room.remainingMs);
        this.#broadcastGame(room);
        return this.#checkEarlyEnd(room);
      case 'extend':
        if (game.phase !== 'action' && game.phase !== 'vote' && game.phase !== 'summary') return;
        game.logTeacher('extend');
        room.phaseMs += 30000;
        if (room.paused) room.remainingMs += 30000;
        else if (room.endsAt !== null) this.#armPhaseTimer(room, room.endsAt - this.#now() + 30000);
        return this.#broadcastTimer(room);
      case 'end':
        if (game.phase === 'ended') return;
        game.endEarly();
        room.endedEarly = true;
        return this.#finish(room);
      case 'rename': {
        const seat = room.seats.get(command.playerId);
        if (!seat) return;
        const taken = new Set([...room.seats.values()].map((s) => s.nickname));
        seat.nickname = randomNickname(() => this.#rng.next(), taken);
        seat.nameLocked = true;
        this.#sendYou(room, seat);
        return this.#broadcastPlayers(room);
      }
      case 'kick': {
        const seat = room.seats.get(command.playerId);
        if (!seat || seat.removed) return;
        seat.removed = true;
        game.removePlayer(seat.id);
        room.voters.delete(seat.id);
        for (const conn of [...room.conns]) {
          if (conn.playerId === seat.id) {
            this.#send(conn, { t: 'kicked' });
            room.conns.delete(conn);
            conn.role = null;
            conn.playerId = null;
          }
        }
        this.#broadcastPlayers(room);
        return this.#checkEarlyEnd(room);
      }
      case 'hide-names':
        room.namesHidden = command.hidden;
        return this.#broadcastGame(room);
    }
  }

  #disconnect(conn: Conn): void {
    if (!conn.open) return;
    conn.open = false;
    const room = this.#roomOf(conn);
    if (!room) return;
    room.conns.delete(conn);
    if (conn.playerId && !this.#seatConnected(room, conn.playerId)) {
      room.game.setConnected(conn.playerId, false);
      this.#broadcastPlayers(room);
      this.#checkEarlyEnd(room);
    }
  }

  // ---------------------------------------------------------------- game flow

  #start(room: Room): void {
    const game = room.game;
    if (game.phase !== 'lobby') return;
    const players = [...room.seats.values()].filter((s) => !s.removed);
    if (players.length === 0) {
      return this.#broadcast(room, (c) => (c.role === 'host' ? { t: 'error', code: 'no-players' } : null));
    }
    room.pendingBots = 0;
    game.start();
    room.started = true;
    this.#enterPhase(room);
  }

  /** Ends the running phase and moves the engine forward. */
  #advance(room: Room): void {
    const game = room.game;
    this.#clearTimer(room, 'phaseTimer');
    this.#clearTimer(room, 'graceTimer');
    room.paused = false;
    switch (game.phase) {
      case 'action':
        game.endActionPhase();
        break;
      case 'vote': {
        const report = game.endVotePhase();
        if (report.vote.outcome === 'built' && report.vote.option && report.vote.x !== undefined && report.vote.y !== undefined) {
          this.#queueTicker(room, { kind: 'built', option: report.vote.option, x: report.vote.x, y: report.vote.y });
        } else if (report.vote.outcome === 'tie') this.#queueTicker(room, { kind: 'tie' });
        break;
      }
      case 'summary':
        game.nextMonth();
        if ((game.phase as Phase) === 'ended') return this.#finish(room);
        room.voters.clear();
        break;
      default:
        return;
    }
    this.#enterPhase(room);
  }

  #enterPhase(room: Room): void {
    const game = room.game;
    for (const seat of room.seats.values()) seat.idle = false;
    const seconds =
      game.phase === 'action' ? room.actionSeconds : game.phase === 'vote' ? this.#options.voteSeconds : this.#options.summarySeconds;
    room.paused = false;
    room.phaseMs = (seconds * 1000) / this.#speed;
    this.#armPhaseTimer(room, room.phaseMs);
    this.#refreshTileCache(room);
    this.#broadcastGame(room);
    for (const seat of room.seats.values()) this.#sendYou(room, seat);
    this.#flushTicker(room);
    if (game.phase === 'action') {
      const need = game.foodNeed();
      const food = game.resources.food;
      if (food < need) this.#broadcastTicker(room, { kind: 'food-short', missing: need - food });
    }
    this.#scheduleBots(room);
    this.#checkEarlyEnd(room);
  }

  #finish(room: Room): void {
    this.#clearTimer(room, 'phaseTimer');
    this.#clearTimer(room, 'graceTimer');
    this.#clearTimer(room, 'botTimer');
    room.endsAt = null;
    room.paused = false;
    this.#refreshTileCache(room);
    this.#broadcastGame(room);
    if (!room.started) return;
    const labels: DebriefLabel[] = [...room.seats.values()].map((s) => ({ id: s.id, label: s.nickname, color: s.color }));
    room.debrief = buildNamedDebrief(room.game, labels);
    if (!room.trial) {
      room.storedToken = randomHex(this.#rng, 40);
      this.#stored.set(room.storedToken, pseudonymizeDebrief(room.debrief));
    }
    for (const conn of room.conns) {
      if (conn.role === 'host') this.#send(conn, { t: 'debrief', debrief: room.debrief, storedToken: room.storedToken });
    }
  }

  #armPhaseTimer(room: Room, ms: number): void {
    this.#clearTimer(room, 'phaseTimer');
    const delay = Math.max(0, ms);
    room.endsAt = this.#now() + delay;
    room.phaseTimer = this.#scheduler.setTimeout(() => {
      room.phaseTimer = null;
      if (room.game.phase === 'lobby') this.#start(room);
      else this.#advance(room);
    }, delay);
  }

  #clearTimer(room: Room, key: 'phaseTimer' | 'graceTimer' | 'botTimer'): void {
    if (room[key] !== null) this.#scheduler.clearTimeout(room[key]);
    room[key] = null;
  }

  /**
   * Design doc §4: the action phase ends when everyone present is done; the vote 3 s
   * after the last vote. Mock choices: nobody present never ends a phase early (the
   * engine's checks are vacuously true then), and bots that are done or abstain count
   * as done, so demo phases do not wait for lazy bots.
   */
  #checkEarlyEnd(room: Room): void {
    const game = room.game;
    if (room.paused) return;
    const present = [...room.seats.values()].filter((s) => !s.removed && (s.bot || this.#seatConnected(room, s.id)));
    if (present.length === 0) return;
    const botsDone = (test: (s: Seat) => boolean) => present.every((s) => !s.bot || test(s));
    const humansOut = present.every((s) => s.bot || (game.player(s.id)?.actionsLeft ?? 0) === 0);
    const humansVoted = present.every((s) => s.bot || room.voters.get(s.id) != null);
    const actionsDone =
      game.allActionsUsed() || (humansOut && botsDone((s) => s.idle || (game.player(s.id)?.actionsLeft ?? 0) === 0));
    const votesDone = game.allVoted() || (humansVoted && botsDone((s) => room.voters.has(s.id)));
    if (game.phase === 'action' && actionsDone) {
      this.#clearTimer(room, 'graceTimer');
      room.graceTimer = this.#scheduler.setTimeout(() => {
        room.graceTimer = null;
        if (room.game.phase === 'action' && !room.paused) this.#advance(room);
      }, 800 / this.#speed);
    } else if (game.phase === 'vote' && votesDone && room.graceTimer === null) {
      const grace = this.#options.voteGraceMs / this.#speed;
      if (room.endsAt !== null && room.endsAt - this.#now() > grace) {
        room.graceTimer = this.#scheduler.setTimeout(() => {
          room.graceTimer = null;
          if (room.game.phase === 'vote' && !room.paused) this.#advance(room);
        }, grace);
      }
    }
  }

  // ---------------------------------------------------------------- actions

  #perform(room: Room, playerId: string, x: number, y: number, conn: Conn | null): boolean {
    const result = room.game.act(playerId, x, y);
    if (!result.ok) {
      if (conn) this.#send(conn, { t: 'act-result', x, y, ok: false, reason: result.reason });
      return false;
    }
    const action = result.events.find((e): e is Extract<LogEntry, { type: 'action' }> => e.type === 'action');
    const gain = action?.gain ?? {};
    if (conn) this.#send(conn, { t: 'act-result', x, y, ok: true, gain });
    // Like apps/server: everyone else sees only the deed (P34); the actor has act-result.
    this.#broadcast(room, (c) => (c.playerId === playerId ? null : { t: 'effect', x, y, gain }));
    const tiles = this.#changedTiles(room);
    const village = this.#villageView(room);
    // Vote options carry `blocked`, which depends on wood, stone and free meadows: resend them too.
    const vote = this.#voteView(room);
    for (const c of room.conns) {
      this.#send(c, {
        t: 'patch',
        ...(tiles.length > 0 ? { tiles } : {}),
        village,
        ...(vote ? { vote } : {}),
        ...(c.role === 'host' ? { players: this.#players(room) } : {}),
      });
    }
    const seat = room.seats.get(playerId);
    if (seat) this.#sendYou(room, seat);
    for (const event of result.events) {
      if (event.type === 'spring-found') this.#broadcastTicker(room, { kind: 'spring-found' });
      else if (event.type === 'field-ready' || event.type === 'quarry-ready' || event.type === 'forest-cleared') {
        this.#broadcastTicker(room, { kind: event.type, x: event.x, y: event.y });
      }
    }
    this.#checkEarlyEnd(room);
    return true;
  }

  #afterVote(room: Room, playerId: string): void {
    const seat = room.seats.get(playerId);
    if (seat) this.#sendYou(room, seat);
    const vote = this.#voteView(room);
    for (const c of room.conns) {
      this.#send(c, { t: 'patch', ...(vote ? { vote } : {}), ...(c.role === 'host' ? { players: this.#players(room) } : {}) });
    }
    this.#checkEarlyEnd(room);
  }

  // ---------------------------------------------------------------- bots

  #addBot(room: Room): boolean {
    if (room.game.phase !== 'lobby' && room.game.month >= room.game.params.joinClosesAtMonth) return false;
    const id = `b${++this.#playerSeq}`;
    if (!room.game.addPlayer(id).ok) return false;
    const index = room.seats.size;
    const taken = new Set([...room.seats.values()].map((s) => s.nickname));
    room.seats.set(id, {
      id,
      nickname: randomNickname(() => this.#rng.next(), taken),
      color: playerColor(index),
      token: randomHex(this.#rng, 32),
      bot: createBot(BOT_MIX[index % BOT_MIX.length]!),
      nameLocked: false,
      removed: false,
      idle: false,
    });
    return true;
  }

  #scheduleBots(room: Room): void {
    if (room.botTimer !== null || room.game.phase === 'ended') return;
    room.botTimer = this.#scheduler.setTimeout(() => {
      room.botTimer = null;
      const busy = this.#botStep(room);
      if (busy) this.#scheduleBots(room);
    }, this.#options.botStepMs / this.#speed);
  }

  /** One bot move. Returns true while bots still have something to do in this phase. */
  #botStep(room: Room): boolean {
    const game = room.game;
    if (room.paused) return true;
    if (game.phase === 'lobby') {
      if (room.pendingBots <= 0) return false;
      room.pendingBots -= 1;
      this.#addBot(room);
      this.#broadcastPlayers(room);
      return room.pendingBots > 0;
    }
    const bots = [...room.seats.values()].filter((s) => s.bot && !s.removed);
    if (game.phase === 'action') {
      const ready = bots.filter((s) => !s.idle && (game.player(s.id)?.actionsLeft ?? 0) > 0);
      if (ready.length === 0) return false;
      const seat = ready[Math.floor(this.#rng.next() * ready.length)]!;
      const move = seat.bot!.chooseAction(game, seat.id, this.#rng);
      if (!move || !this.#perform(room, seat.id, move.x, move.y, null)) {
        seat.idle = true;
        this.#checkEarlyEnd(room);
      }
      return true;
    }
    if (game.phase === 'vote') {
      const waiting = bots.filter((s) => !room.voters.has(s.id));
      if (waiting.length === 0) return false;
      const seat = waiting[Math.floor(this.#rng.next() * waiting.length)]!;
      const option = seat.bot!.chooseVote(game, seat.id, this.#rng);
      if (option !== null && game.vote(seat.id, option).ok) {
        room.voters.set(seat.id, option);
        this.#afterVote(room, seat.id);
      } else {
        room.voters.set(seat.id, null);
        this.#checkEarlyEnd(room);
      }
      return true;
    }
    return false;
  }

  #createDemoRoom(code: string): Room {
    this.createGame({ length: 'short', actionSeconds: 45, trial: true }, code);
    const room = this.#rooms.get(code)!;
    // A student-only demo has no teacher to press start.
    room.autoStart = true;
    return room;
  }

  // ---------------------------------------------------------------- views

  #gameView(room: Room, forHost: boolean): GameView {
    const game = room.game;
    const started = game.phase !== 'lobby' && room.started;
    const result =
      game.phase === 'ended' && room.started ? { happiness: game.happiness, grade: game.grade(), early: room.endedEarly } : null;
    return {
      code: room.code,
      length: room.length,
      phase: game.phase,
      month: game.month,
      totalMonths: game.totalMonths,
      timer: this.#timerView(room),
      joinOpen: this.#joinOpen(room),
      namesHidden: room.namesHidden,
      trial: room.trial,
      village: this.#villageView(room),
      map: started
        ? {
            width: game.width,
            height: game.height,
            landing: game.landing,
            tiles: game.tiles().map((t) => game.publicTile(t.x, t.y)!),
          }
        : null,
      vote: this.#voteView(room),
      lastReport: game.reports.at(-1) ?? null,
      players: forHost ? this.#players(room) : [],
      playerCount: [...room.seats.values()].filter((s) => !s.removed).length,
      result,
    };
  }

  #timerView(room: Room): TimerView {
    const phase = room.game.phase;
    if (phase === 'lobby' || phase === 'ended') return { phaseEndsAt: null, remainingMs: 0, phaseMs: 0, paused: false };
    if (room.paused) return { phaseEndsAt: null, remainingMs: room.remainingMs, phaseMs: room.phaseMs, paused: true };
    const endsAt = room.endsAt ?? this.#now();
    return { phaseEndsAt: endsAt, remainingMs: Math.max(0, endsAt - this.#now()), phaseMs: room.phaseMs, paused: false };
  }

  #villageView(room: Room): VillageView {
    const game = room.game;
    return {
      resources: game.resources,
      foodNeed: game.foodNeed(),
      foodStorage: game.foodStorage(),
      villagers: game.villagers,
      shelterShare: game.shelterShare(),
      shelterCapacity: game.shelterCapacity(),
      happiness: game.happiness,
      recreationThisMonth: game.recreationThisMonth,
    };
  }

  #voteView(room: Room): VoteView | null {
    const game = room.game;
    if (game.phase === 'lobby' || game.phase === 'ended' || !room.started) return null;
    const counts = game.voteCounts();
    return {
      options: game.voteOptions(),
      counts,
      votesCast: Object.values(counts).reduce((a, b) => a + b, 0),
    };
  }

  #players(room: Room): PlayerSummary[] {
    return [...room.seats.values()].map((seat) => {
      const view = room.game.player(seat.id);
      return {
        id: seat.id,
        nickname: room.namesHidden ? null : seat.nickname,
        color: seat.color,
        connected: seat.bot ? true : this.#seatConnected(room, seat.id),
        removed: seat.removed,
        nameLocked: seat.nameLocked,
        actionsLeft: view?.actionsLeft ?? 0,
        voted: room.voters.get(seat.id) !== undefined && room.voters.get(seat.id) !== null,
      };
    });
  }

  #youView(room: Room, seat: Seat): YouView {
    const view = room.game.player(seat.id)!;
    return { ...view, nickname: seat.nickname, color: seat.color, vote: room.voters.get(seat.id) ?? null };
  }

  #joinOpen(room: Room): boolean {
    const game = room.game;
    if (game.phase === 'ended') return false;
    return game.phase === 'lobby' || game.month < game.params.joinClosesAtMonth;
  }

  #seatConnected(room: Room, playerId: string): boolean {
    for (const conn of room.conns) if (conn.open && conn.playerId === playerId) return true;
    return false;
  }

  #refreshTileCache(room: Room): void {
    const game = room.game;
    room.tileCache = game.tiles().map((t) => JSON.stringify(game.publicTile(t.x, t.y)));
  }

  #changedTiles(room: Room): PublicTile[] {
    const game = room.game;
    const changed: PublicTile[] = [];
    game.tiles().forEach((t, i) => {
      const view = game.publicTile(t.x, t.y)!;
      const json = JSON.stringify(view);
      if (room.tileCache[i] !== json) {
        room.tileCache[i] = json;
        changed.push(view);
      }
    });
    return changed;
  }

  // ---------------------------------------------------------------- sending

  #roomOf(conn: Conn): Room | undefined {
    for (const room of this.#rooms.values()) if (room.conns.has(conn)) return room;
    return undefined;
  }

  #refuse(conn: Conn, reason: JoinRefusal): void {
    this.#send(conn, { t: 'refused-join', reason });
  }

  /** Delivers asynchronously, in order, like a socket would. */
  #send(conn: Conn, message: ServerMessage): void {
    if (!conn.open) return;
    conn.queue.push(message);
    if (conn.flushing) return;
    conn.flushing = true;
    queueMicrotask(() => {
      conn.flushing = false;
      const batch = conn.queue.splice(0);
      for (const m of batch) if (conn.open) conn.sink(structuredClone(m));
    });
  }

  #broadcast(room: Room, build: (conn: Conn) => ServerMessage | null): void {
    for (const conn of room.conns) {
      const message = build(conn);
      if (message) this.#send(conn, message);
    }
  }

  #broadcastGame(room: Room): void {
    const host = this.#gameView(room, true);
    const player = { ...host, players: [] };
    this.#broadcast(room, (c) => ({ t: 'game', game: c.role === 'host' ? host : player }));
  }

  #broadcastTimer(room: Room): void {
    const timer = this.#timerView(room);
    this.#broadcast(room, () => ({ t: 'patch', timer }));
  }

  #broadcastPlayers(room: Room): void {
    const players = this.#players(room);
    const playerCount = players.filter((p) => !p.removed).length;
    this.#broadcast(room, (c) => (c.role === 'host' ? { t: 'patch', players, playerCount } : { t: 'patch', playerCount }));
  }

  #queueTicker(room: Room, event: TickerEvent): void {
    const list = this.#pendingTicker.get(room) ?? [];
    list.push(event);
    this.#pendingTicker.set(room, list);
  }

  #flushTicker(room: Room): void {
    const list = this.#pendingTicker.get(room);
    if (!list) return;
    this.#pendingTicker.delete(room);
    for (const event of list) this.#broadcastTicker(room, event);
  }

  #broadcastTicker(room: Room, event: TickerEvent): void {
    this.#broadcast(room, () => ({ t: 'ticker', event }));
  }

  #sendYou(room: Room, seat: Seat): void {
    if (seat.bot) return;
    const you = this.#youView(room, seat);
    for (const conn of room.conns) if (conn.playerId === seat.id) this.#send(conn, { t: 'you', you });
  }

  #now(): number {
    return this.#scheduler.now();
  }

  #newCode(): string {
    for (;;) {
      const code = String(100000 + Math.floor(this.#rng.next() * 900000));
      if (!this.#rooms.has(code)) return code;
    }
  }

  #notifyRooms(): void {
    for (const listener of this.#roomListeners) listener();
  }
}

function buildNamedDebrief(game: Game, labels: readonly DebriefLabel[]): DebriefData {
  try {
    return buildDebrief(game, labels);
  } catch {
    return fallbackDebrief(game, labels);
  }
}

function pseudonymizeDebrief(debrief: DebriefData): DebriefData {
  try {
    return pseudonymize(debrief);
  } catch {
    return fallbackPseudonymize(debrief);
  }
}
