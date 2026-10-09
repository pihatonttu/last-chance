import { createBot, seatsFor, type Bot } from '@saari/bots';
import { buildDebrief, pseudonymize, type DebriefData, type DebriefLabel } from '@saari/debrief';
import { checkNickname, colorFor, randomNickname, type NicknameCheck } from '@saari/names';
import type {
  ClientMessage,
  ErrorCode,
  GameStatusResponse,
  GameView,
  HostCommand,
  JoinRefusal,
  MapView,
  PlayerSummary,
  ServerMessage,
  TickerEvent,
  TimerView,
  VillageView,
  VoteView,
  YouView,
} from '@saari/protocol';
import {
  createGame,
  createRng,
  type Game,
  type GameLength,
  type GameParams,
  type LogEntry,
  type Phase,
  type PublicTile,
  type Rng,
} from '@saari/rules';
import type { Scheduler, TimerHandle } from './clock.ts';
import { newSecret, sameSecret } from './ids.ts';

/** Technical limit per game (P15). */
export const MAX_PLAYERS = 40;
/** Bots in the teacher's trial game (P19). */
export const TRIAL_BOTS = 20;
/** Mostly well-behaved bots so the trial game shows how the game should go. */
const TRIAL_MIX = { cooperative: 4, random: 1 } as const;

export type ActionSeconds = 45 | 60 | 90;

/** One browser tab as the session sees it. */
export interface Peer {
  send(message: ServerMessage): void;
  close(): void;
}

/** Where pseudonymised debriefs go; returns the link token. */
export interface DebriefSink {
  save(debrief: DebriefData): string;
}

/** The @saari/names functions the session uses (injectable for tests). */
export interface Naming {
  check(raw: string): NicknameCheck;
  random(random: () => number, taken: ReadonlySet<string>): string;
  color(index: number): string;
}

/** The @saari/debrief functions the session uses (injectable for tests). */
export interface Debriefing {
  build(game: Game, labels: readonly DebriefLabel[], now: Date): DebriefData;
  pseudonymize(debrief: DebriefData): DebriefData;
}

export const defaultNaming: Naming = {
  check: checkNickname,
  random: randomNickname,
  color: colorFor,
};

export const defaultDebriefing: Debriefing = { build: buildDebrief, pseudonymize };

/** Phase lengths in milliseconds of server time (design doc §4). */
export interface Timing {
  actionMs: number;
  voteMs: number;
  summaryMs: number;
  /** The vote ends this long after everyone present has voted. */
  graceMs: number;
  /** The teacher's "+30 s". */
  extendMs: number;
  /** Trial bots: delay before each action and before voting. */
  botActionMs: readonly [number, number];
  botVoteMs: readonly [number, number];
}

export function timingFor(actionSeconds: number, timeScale = 1): Timing {
  const ms = (seconds: number) => (seconds * 1000) / timeScale;
  return {
    actionMs: ms(actionSeconds),
    voteMs: ms(30),
    summaryMs: ms(8),
    graceMs: ms(3),
    extendMs: ms(30),
    botActionMs: [ms(1), ms(3)],
    botVoteMs: [ms(2), ms(8)],
  };
}

export interface SessionOptions {
  code: string;
  hostToken: string;
  length: GameLength;
  actionSeconds: ActionSeconds;
  trial: boolean;
  scheduler: Scheduler;
  timing: Timing;
  seed: number;
  /** null: nothing is stored. Trial games are never stored either way. */
  store: DebriefSink | null;
  /** Names for renames and bots, bot delays. */
  random?: () => number;
  naming?: Naming;
  debriefing?: Debriefing;
  params?: GameParams;
  /** One line per game created/started/ended; never nicknames. */
  log?: (line: string) => void;
  newToken?: () => string;
  botCount?: number;
}

export interface JoinHello {
  nickname?: string;
  playerToken?: string;
}

interface Member {
  id: string;
  nickname: string;
  /** Lower-case nickname for comparisons. */
  key: string;
  color: string;
  /** null for bots. */
  token: string | null;
  nameLocked: boolean;
  kicked: boolean;
  bot: Bot | null;
  peer: Peer | null;
  botTimer: TimerHandle | null;
  /** The last YouView sent, serialised. */
  lastYou: string | null;
}

type JoinPlan =
  | { kind: 'refuse'; reason: JoinRefusal }
  | { kind: 'rejoin'; member: Member }
  | { kind: 'new'; nickname: string };

type Patch = Extract<ServerMessage, { t: 'patch' }>;

const keyOf = (nickname: string) => nickname.toLowerCase();
const refuse = (reason: JoinRefusal): JoinPlan => ({ kind: 'refuse', reason });

/**
 * One game: the rules engine plus everything around it that lives only in memory —
 * nicknames, colours, tokens, phase timers, moderation and the views sent to clients.
 */
export class GameSession {
  readonly code: string;
  readonly trial: boolean;
  readonly actionSeconds: ActionSeconds;

  readonly #hostToken: string;
  readonly #game: Game;
  readonly #scheduler: Scheduler;
  readonly #timing: Timing;
  readonly #store: DebriefSink | null;
  readonly #random: () => number;
  readonly #naming: Naming;
  readonly #debriefing: Debriefing;
  readonly #logLine: (line: string) => void;
  readonly #newToken: () => string;
  readonly #botRng: Rng;

  readonly #members = new Map<string, Member>();
  readonly #byToken = new Map<string, Member>();
  readonly #byPeer = new Map<Peer, Member>();
  readonly #revoked = new Set<string>();
  readonly #blocked = new Map<string, 'kicked' | 'reserved'>();
  readonly #hosts = new Set<Peer>();
  /** Votes this month, for `YouView.vote` and `PlayerSummary.voted`. */
  readonly #votes = new Map<string, string>();
  #namesHidden = false;
  #early = false;
  #endedAt: number | null = null;
  #lastActivity: number;
  #debrief: DebriefData | null = null;
  #storedToken: string | null = null;
  #nextId = 1;
  #disposed = false;

  #timer: TimerHandle | null = null;
  #deadline: number | null = null;
  #remaining = 0;
  /** Length of the running phase incl. extensions (TimerView.phaseMs). */
  #phaseMs = 0;
  #paused = false;
  #graceActive = false;
  #graceCut = 0;

  /** What the clients already have, for patches. */
  #sentTiles: string[] = [];
  #sentVillage = '';
  #sentVote = '';
  #sentPlayers = '';
  #sentCount = -1;
  #timerDirty = false;
  #logCursor = 0;

  constructor(options: SessionOptions) {
    this.code = options.code;
    this.trial = options.trial;
    this.actionSeconds = options.actionSeconds;
    this.#hostToken = options.hostToken;
    this.#scheduler = options.scheduler;
    this.#timing = options.timing;
    this.#store = options.store;
    this.#random = options.random ?? Math.random;
    this.#naming = options.naming ?? defaultNaming;
    this.#debriefing = options.debriefing ?? defaultDebriefing;
    this.#logLine = options.log ?? ((line) => console.log(line));
    this.#newToken = options.newToken ?? (() => newSecret());
    this.#botRng = createRng(options.seed ^ 0x2545f491);
    this.#game = createGame({
      seed: options.seed,
      length: options.length,
      clock: () => this.#scheduler.now(),
      ...(options.params ? { params: options.params } : {}),
    });
    this.#lastActivity = this.#now();
    if (this.trial) this.#addBots(options.botCount ?? TRIAL_BOTS);
    // The bots' joins are not news.
    this.#logCursor = this.#game.log.length;
    this.#logLine(`game ${this.code} created${this.trial ? ' (trial)' : ''}`);
  }

  // ---------------------------------------------------------------- queries

  /** The engine, for read-only use (status, tests). */
  get game(): Game {
    return this.#game;
  }

  get phase(): Phase {
    return this.#game.phase;
  }

  get endedAt(): number | null {
    return this.#endedAt;
  }

  /** Last time a person (host or player) did something here. */
  get lastActivity(): number {
    return this.#lastActivity;
  }

  /** Players the teacher has not removed, bots included. */
  get playerCount(): number {
    let n = 0;
    for (const m of this.#members.values()) if (!m.kicked) n += 1;
    return n;
  }

  /** New players may join: lobby or months 1..3 (P33), and room left. */
  get joinOpen(): boolean {
    const g = this.#game;
    if (this.#disposed || g.phase === 'ended' || this.playerCount >= MAX_PLAYERS) return false;
    return g.phase === 'lobby' || g.month < g.params.joinClosesAtMonth;
  }

  status(): GameStatusResponse {
    return { exists: true, joinOpen: this.joinOpen, phase: this.#game.phase };
  }

  // ---------------------------------------------------------------- connections

  connectHost(peer: Peer, hostToken: string): boolean {
    this.#touch();
    if (this.#disposed || !sameSecret(hostToken, this.#hostToken)) {
      peer.send({ t: 'refused-join', reason: 'bad-token' });
      return false;
    }
    this.#hosts.add(peer);
    peer.send({ t: 'welcome', role: 'host', game: this.#view('host'), you: null, serverTime: this.#now() });
    if (this.#debrief) peer.send({ t: 'debrief', debrief: this.#debrief, storedToken: this.#storedToken });
    return true;
  }

  /** Join or rejoin (P23). Sends `welcome` or `refused-join`; returns the refusal. */
  joinPlayer(peer: Peer, hello: JoinHello): JoinRefusal | null {
    this.#touch();
    const plan = this.#planJoin(hello);
    if (plan.kind === 'refuse') {
      peer.send({ t: 'refused-join', reason: plan.reason });
      return plan.reason;
    }
    let member: Member;
    if (plan.kind === 'new') {
      const id = `p${this.#nextId++}`;
      const added = this.#game.addPlayer(id);
      if (!added.ok) {
        const reason: JoinRefusal = added.reason === 'game-ended' ? 'game-ended' : 'join-closed';
        peer.send({ t: 'refused-join', reason });
        return reason;
      }
      member = this.#newMember(id, plan.nickname, this.#newToken(), null);
      this.#byToken.set(member.token!, member);
    } else {
      member = plan.member;
    }
    this.#attach(member, peer);
    const you = this.#you(member);
    member.lastYou = JSON.stringify(you);
    peer.send({
      t: 'welcome',
      role: 'player',
      game: this.#view('player'),
      you,
      ...(member.token ? { playerToken: member.token } : {}),
      serverTime: this.#now(),
    });
    this.#afterChange();
    return null;
  }

  disconnect(peer: Peer): void {
    if (this.#hosts.delete(peer)) return;
    const member = this.#byPeer.get(peer);
    if (!member) return;
    this.#byPeer.delete(peer);
    if (member.peer !== peer) return;
    member.peer = null;
    this.#game.setConnected(member.id, false);
    this.#afterChange();
  }

  handle(peer: Peer, message: ClientMessage): void {
    if (this.#disposed) return;
    this.#touch();
    switch (message.t) {
      case 'host':
        this.#hostCommand(peer, message.command);
        return;
      case 'inspect': {
        const member = this.#memberOf(peer);
        if (member) {
          const preview = this.#game.preview(member.id, message.x, message.y);
          peer.send({ t: 'preview', x: message.x, y: message.y, preview });
        }
        return;
      }
      case 'act': {
        const member = this.#memberOf(peer);
        if (member) this.#act(member, message.x, message.y);
        return;
      }
      case 'vote': {
        const member = this.#memberOf(peer);
        if (member) this.#vote(member, message.option);
        return;
      }
      default:
        peer.send({ t: 'error', code: 'unexpected-message' });
    }
  }

  /** Stops the timers and closes every connection. */
  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#clearTimer();
    this.#clearBotTimers();
    const peers = [...this.#hosts, ...[...this.#members.values()].flatMap((m) => (m.peer ? [m.peer] : []))];
    this.#hosts.clear();
    this.#byPeer.clear();
    for (const m of this.#members.values()) m.peer = null;
    for (const peer of peers) {
      peer.send({ t: 'error', code: 'game-closed' });
      peer.close();
    }
  }

  // ---------------------------------------------------------------- joining

  #planJoin(hello: JoinHello): JoinPlan {
    if (this.#disposed) return refuse('unknown-game');
    const { nickname, playerToken } = hello;
    if (playerToken !== undefined) {
      if (this.#revoked.has(playerToken)) return refuse('kicked');
      const member = this.#byToken.get(playerToken);
      if (member) return { kind: 'rejoin', member };
      if (nickname === undefined) return refuse('bad-token');
    }
    if (nickname === undefined) return refuse('nickname-invalid');
    const check = this.#naming.check(nickname);
    if (check.ok) {
      const key = keyOf(check.nickname);
      const blocked = this.#blocked.get(key);
      if (blocked === 'kicked') return refuse('kicked');
      if (blocked === 'reserved') return refuse('nickname-taken');
      const existing = [...this.#members.values()].find((m) => !m.kicked && m.key === key);
      if (existing) {
        // Coming back by nickname only works while that player is away (P23).
        return existing.bot || existing.peer ? refuse('nickname-taken') : { kind: 'rejoin', member: existing };
      }
    }
    if (this.#game.phase === 'ended') return refuse('game-ended');
    if (!this.joinOpen) return refuse('join-closed');
    if (!check.ok) return refuse(check.reason === 'offensive' ? 'nickname-offensive' : 'nickname-invalid');
    return { kind: 'new', nickname: check.nickname };
  }

  #newMember(id: string, nickname: string, token: string | null, bot: Bot | null): Member {
    const member: Member = {
      id,
      nickname,
      key: keyOf(nickname),
      color: this.#naming.color(this.#members.size),
      token,
      nameLocked: false,
      kicked: false,
      bot,
      peer: null,
      botTimer: null,
      lastYou: null,
    };
    this.#members.set(id, member);
    return member;
  }

  #attach(member: Member, peer: Peer): void {
    const old = member.peer;
    if (old && old !== peer) {
      this.#byPeer.delete(old);
      old.send({ t: 'error', code: 'replaced' });
      old.close();
    }
    member.peer = peer;
    this.#byPeer.set(peer, member);
    this.#game.setConnected(member.id, true);
  }

  #memberOf(peer: Peer): Member | undefined {
    const member = this.#byPeer.get(peer);
    if (!member) peer.send({ t: 'error', code: 'not-a-player' });
    return member;
  }

  #addBots(count: number): void {
    for (const seat of seatsFor(TRIAL_MIX, count)) {
      this.#game.addPlayer(seat.id);
      this.#newMember(seat.id, this.#freshName(), null, createBot(seat.strategy));
    }
  }

  /** A random nickname nobody in this game has or had. */
  #freshName(): string {
    const taken = new Set<string>(this.#blocked.keys());
    for (const m of this.#members.values()) {
      taken.add(m.key);
      taken.add(m.nickname);
    }
    let name = '';
    for (let i = 0; i < 50; i++) {
      name = this.#naming.random(this.#random, taken);
      if (!taken.has(keyOf(name))) return name;
    }
    return `${name} ${this.#members.size + 1}`;
  }

  // ---------------------------------------------------------------- actions and votes

  #act(member: Member, x: number, y: number): void {
    // The engine checks the tile before the phase; outside the action phase say so plainly.
    if (this.#paused || this.#game.phase !== 'action') {
      member.peer?.send({ t: 'act-result', x, y, ok: false, reason: 'wrong-phase' });
      return;
    }
    const result = this.#game.act(member.id, x, y);
    if (!result.ok) {
      member.peer?.send({ t: 'act-result', x, y, ok: false, reason: result.reason });
      return;
    }
    const entry = result.events.find((e) => e.type === 'action');
    const gain = entry?.type === 'action' ? entry.gain : {};
    member.peer?.send({ t: 'act-result', x, y, ok: true, gain });
    // Everyone else sees only the deed, never the doer (P34).
    this.#broadcast({ t: 'effect', x, y, gain }, member.peer);
    this.#afterChange();
  }

  #vote(member: Member, option: string): void {
    if (this.#paused) {
      member.peer?.send({ t: 'vote-result', ok: false, reason: 'wrong-phase' });
      return;
    }
    const result = this.#game.vote(member.id, option);
    if (!result.ok) {
      member.peer?.send({ t: 'vote-result', ok: false, reason: result.reason });
      return;
    }
    this.#votes.set(member.id, option);
    member.peer?.send({ t: 'vote-result', ok: true });
    this.#afterChange();
  }

  // ---------------------------------------------------------------- teacher

  #hostCommand(peer: Peer, command: HostCommand): void {
    if (!this.#hosts.has(peer)) {
      peer.send({ t: 'error', code: 'not-host' });
      return;
    }
    const fail = (code: ErrorCode) => peer.send({ t: 'error', code });
    const g = this.#game;
    const running = g.phase === 'action' || g.phase === 'vote' || g.phase === 'summary';
    switch (command.type) {
      case 'start':
        if (g.phase !== 'lobby') return fail('wrong-phase');
        if (this.playerCount === 0) return fail('no-players');
        g.start();
        this.#logLine(`game ${this.code} started, ${this.playerCount} players`);
        this.#beginPhase();
        return;
      case 'pause':
        if (!running) return fail('wrong-phase');
        if (this.#paused) return;
        this.#pauseTimer();
        this.#clearBotTimers();
        g.logTeacher('pause');
        this.#broadcastGame();
        return;
      case 'resume':
        if (!this.#paused) return;
        this.#startTimer(this.#remaining);
        g.logTeacher('resume');
        this.#broadcastGame();
        this.#scheduleBots();
        this.#checkProgress();
        return;
      case 'extend':
        if (!running) return fail('wrong-phase');
        this.#shiftTimer(this.#timing.extendMs);
        g.logTeacher('extend');
        this.#timerDirty = true;
        this.#flush();
        return;
      case 'end':
        if (g.phase === 'ended') return;
        g.endEarly();
        this.#finish(true);
        return;
      case 'rename': {
        const member = this.#members.get(command.playerId);
        if (!member || member.kicked) return fail('unknown-player');
        const name = this.#freshName();
        this.#blocked.set(member.key, 'reserved');
        member.nickname = name;
        member.key = keyOf(name);
        member.nameLocked = true;
        this.#flush();
        return;
      }
      case 'kick': {
        const member = this.#members.get(command.playerId);
        if (!member || member.kicked) return fail('unknown-player');
        this.#kick(member);
        return;
      }
      case 'hide-names':
        this.#namesHidden = command.hidden;
        this.#broadcastGame();
        return;
    }
  }

  #kick(member: Member): void {
    member.kicked = true;
    this.#blocked.set(member.key, 'kicked');
    if (member.token) {
      this.#byToken.delete(member.token);
      this.#revoked.add(member.token);
    }
    this.#clearBotTimer(member);
    this.#votes.delete(member.id);
    this.#game.removePlayer(member.id);
    this.#game.setConnected(member.id, false);
    const peer = member.peer;
    if (peer) {
      member.peer = null;
      this.#byPeer.delete(peer);
      peer.send({ t: 'kicked' });
      peer.close();
    }
    this.#afterChange();
  }

  // ---------------------------------------------------------------- phases

  /** Called whenever the engine has entered a new phase. */
  #beginPhase(): void {
    const g = this.#game;
    this.#graceActive = false;
    this.#graceCut = 0;
    this.#clearBotTimers();
    switch (g.phase) {
      case 'action':
        this.#votes.clear();
        this.#phaseMs = this.#timing.actionMs;
        this.#startTimer(this.#timing.actionMs);
        break;
      case 'vote':
        this.#phaseMs = this.#timing.voteMs;
        this.#startTimer(this.#timing.voteMs);
        break;
      case 'summary':
        this.#phaseMs = this.#timing.summaryMs;
        this.#startTimer(this.#timing.summaryMs);
        break;
      default:
        return;
    }
    this.#broadcastGame();
    this.#tickers();
    if (g.phase === 'action') {
      const missing = g.foodNeed() - g.resources.food;
      if (missing > 0) this.#broadcast({ t: 'ticker', event: { kind: 'food-short', missing } });
    }
    this.#scheduleBots();
    this.#checkProgress();
  }

  /** Ends the current phase (timer ran out or everyone is done). */
  #advance(): void {
    const g = this.#game;
    this.#clearTimer();
    this.#deadline = null;
    switch (g.phase) {
      case 'action':
        g.endActionPhase();
        this.#beginPhase();
        return;
      case 'vote':
        g.endVotePhase();
        this.#beginPhase();
        return;
      case 'summary':
        g.nextMonth();
        // `this.phase`, not `g.phase`: TypeScript still narrows g.phase to 'summary' here.
        if (this.phase === 'ended') this.#finish(false);
        else this.#beginPhase();
        return;
      default:
        return;
    }
  }

  /** Early phase ends (§4): everyone present has acted or voted. */
  #checkProgress(): void {
    const g = this.#game;
    if (this.#disposed || this.#paused || (g.phase !== 'action' && g.phase !== 'vote')) return;
    // With nobody connected (a network cut), the timers decide.
    if (!this.#anyonePresent()) return;
    if (g.phase === 'action') {
      if (g.allActionsUsed()) this.#advance();
      return;
    }
    const all = g.allVoted();
    if (all && !this.#graceActive) {
      this.#graceActive = true;
      this.#graceCut = Math.max(0, this.#remainingMs() - this.#timing.graceMs);
      if (this.#graceCut > 0) {
        this.#shiftTimer(-this.#graceCut);
        this.#timerDirty = true;
        this.#flush();
      }
    } else if (!all && this.#graceActive) {
      this.#graceActive = false;
      if (this.#graceCut > 0) {
        this.#shiftTimer(this.#graceCut);
        this.#timerDirty = true;
        this.#flush();
      }
      this.#graceCut = 0;
    }
  }

  #anyonePresent(): boolean {
    for (const m of this.#members.values()) {
      if (!m.kicked && this.#game.player(m.id)?.connected) return true;
    }
    return false;
  }

  #finish(early: boolean): void {
    this.#clearTimer();
    this.#clearBotTimers();
    this.#deadline = null;
    this.#remaining = 0;
    this.#paused = false;
    this.#graceActive = false;
    this.#early = early;
    this.#endedAt = this.#now();
    if (this.#game.month >= 1) this.#makeDebrief();
    this.#broadcastGame();
    this.#tickers();
    if (this.#debrief) {
      for (const host of this.#hosts) host.send({ t: 'debrief', debrief: this.#debrief, storedToken: this.#storedToken });
    }
    this.#logLine(
      `game ${this.code} ended${early ? ' early' : ''} in month ${this.#game.month}, ${this.playerCount} players`,
    );
  }

  /** Named debrief in memory for the host; only the pseudonymised copy is stored (P23). */
  #makeDebrief(): void {
    const labels: DebriefLabel[] = [...this.#members.values()].map((m) => ({ id: m.id, label: m.nickname, color: m.color }));
    try {
      this.#debrief = this.#debriefing.build(this.#game, labels, new Date(this.#now()));
    } catch (error) {
      this.#logLine(`game ${this.code}: building the debrief failed: ${errorText(error)}`);
      return;
    }
    if (this.trial || !this.#store) return;
    try {
      this.#storedToken = this.#store.save(this.#debriefing.pseudonymize(this.#debrief));
    } catch (error) {
      this.#logLine(`game ${this.code}: storing the debrief failed: ${errorText(error)}`);
    }
  }

  // ---------------------------------------------------------------- timer

  #now(): number {
    return this.#scheduler.now();
  }

  #touch(): void {
    this.#lastActivity = this.#now();
  }

  #startTimer(ms: number): void {
    this.#clearTimer();
    this.#paused = false;
    this.#remaining = ms;
    this.#deadline = this.#now() + ms;
    this.#timer = this.#scheduler.setTimeout(() => {
      this.#timer = null;
      this.#advance();
    }, ms);
  }

  #clearTimer(): void {
    if (this.#timer) this.#scheduler.clearTimeout(this.#timer);
    this.#timer = null;
  }

  #remainingMs(): number {
    if (this.#paused) return this.#remaining;
    if (this.#deadline === null) return 0;
    return Math.max(0, this.#deadline - this.#now());
  }

  #pauseTimer(): void {
    this.#remaining = this.#remainingMs();
    this.#clearTimer();
    this.#deadline = null;
    this.#paused = true;
  }

  #shiftTimer(deltaMs: number): void {
    // Extensions make the phase longer; the vote grace cut only brings the end closer.
    if (deltaMs > 0) this.#phaseMs += deltaMs;
    const next = Math.max(0, this.#remainingMs() + deltaMs);
    if (this.#paused) this.#remaining = next;
    else this.#startTimer(next);
  }

  #timerView(): TimerView {
    const phase = this.#game.phase;
    if (phase === 'lobby' || phase === 'ended') return { phaseEndsAt: null, remainingMs: 0, phaseMs: 0, paused: false };
    return {
      phaseEndsAt: this.#paused ? null : this.#deadline,
      remainingMs: this.#remainingMs(),
      phaseMs: this.#phaseMs,
      paused: this.#paused,
    };
  }

  // ---------------------------------------------------------------- trial bots

  #scheduleBots(): void {
    if (this.#paused || this.#disposed) return;
    const g = this.#game;
    for (const m of this.#members.values()) {
      if (!m.bot || m.kicked || m.botTimer) continue;
      if (g.phase === 'action' && (g.player(m.id)?.actionsLeft ?? 0) > 0) {
        this.#scheduleBot(m, this.#timing.botActionMs, () => this.#botAct(m));
      } else if (g.phase === 'vote' && !this.#votes.has(m.id)) {
        this.#scheduleBot(m, this.#timing.botVoteMs, () => this.#botVote(m));
      }
    }
  }

  #scheduleBot(m: Member, [min, max]: readonly [number, number], run: () => void): void {
    const delay = min + this.#random() * (max - min);
    m.botTimer = this.#scheduler.setTimeout(() => {
      m.botTimer = null;
      run();
    }, delay);
  }

  /** One action, then the next one after another short pause, so the map stays lively. */
  #botAct(m: Member): void {
    const g = this.#game;
    if (this.#paused || this.#disposed || m.kicked || g.phase !== 'action') return;
    const move = m.bot!.chooseAction(g, m.id, this.#botRng);
    if (!move) return;
    this.#act(m, move.x, move.y);
    if (!m.botTimer && !this.#paused && g.phase === 'action' && (g.player(m.id)?.actionsLeft ?? 0) > 0) {
      this.#scheduleBot(m, this.#timing.botActionMs, () => this.#botAct(m));
    }
  }

  #botVote(m: Member): void {
    const g = this.#game;
    if (this.#paused || this.#disposed || m.kicked || g.phase !== 'vote') return;
    const option = m.bot!.chooseVote(g, m.id, this.#botRng);
    if (option !== null) this.#vote(m, option);
  }

  #clearBotTimer(m: Member): void {
    if (m.botTimer) this.#scheduler.clearTimeout(m.botTimer);
    m.botTimer = null;
  }

  #clearBotTimers(): void {
    for (const m of this.#members.values()) this.#clearBotTimer(m);
  }

  // ---------------------------------------------------------------- views

  #view(role: 'host' | 'player'): GameView {
    const g = this.#game;
    return {
      code: this.code,
      length: g.length,
      phase: g.phase,
      month: g.month,
      totalMonths: g.totalMonths,
      timer: this.#timerView(),
      joinOpen: this.joinOpen,
      namesHidden: this.#namesHidden,
      trial: this.trial,
      village: this.#village(),
      map: this.#map(),
      vote: this.#voteView(),
      lastReport: g.reports.at(-1) ?? null,
      // Students never get the other players' nicknames (P34).
      players: role === 'host' ? this.#playerSummaries() : [],
      playerCount: this.playerCount,
      result: g.phase === 'ended' ? { happiness: g.happiness, grade: g.grade(), early: this.#early } : null,
    };
  }

  #village(): VillageView {
    const g = this.#game;
    return {
      resources: g.resources,
      foodNeed: g.foodNeed(),
      foodStorage: g.foodStorage(),
      villagers: g.villagers,
      shelterShare: g.shelterShare(),
      shelterCapacity: g.shelterCapacity(),
      happiness: g.happiness,
      recreationThisMonth: g.recreationThisMonth,
    };
  }

  #map(): MapView | null {
    const g = this.#game;
    if (g.width === 0) return null;
    return { width: g.width, height: g.height, landing: g.landing, tiles: this.#tiles() };
  }

  /** Every tile through publicTile: fogged terrain never leaves the server. */
  #tiles(): PublicTile[] {
    const g = this.#game;
    return g.tiles().map((t) => g.publicTile(t.x, t.y)!);
  }

  #voteView(): VoteView | null {
    const g = this.#game;
    if (g.phase !== 'action' && g.phase !== 'vote') return null;
    const counts = g.voteCounts();
    const votesCast = Object.values(counts).reduce((a, b) => a + b, 0);
    return { options: g.voteOptions(), counts, votesCast };
  }

  #playerSummaries(): PlayerSummary[] {
    return [...this.#members.values()].map((m) => {
      const p = this.#game.player(m.id)!;
      return {
        id: m.id,
        nickname: this.#namesHidden ? null : m.nickname,
        color: m.color,
        connected: p.connected,
        removed: p.removed,
        nameLocked: m.nameLocked,
        actionsLeft: p.actionsLeft,
        voted: this.#votes.has(m.id),
      };
    });
  }

  #you(m: Member): YouView {
    return {
      ...this.#game.player(m.id)!,
      nickname: m.nickname,
      color: m.color,
      vote: this.#votes.get(m.id) ?? null,
    };
  }

  // ---------------------------------------------------------------- sending

  #broadcast(message: ServerMessage, except: Peer | null = null): void {
    for (const host of this.#hosts) if (host !== except) host.send(message);
    for (const m of this.#members.values()) if (m.peer && m.peer !== except) m.peer.send(message);
  }

  /** Full views to everyone (phase changes, pause, hide names...). */
  #broadcastGame(): void {
    const hostView = this.#view('host');
    const playerView = this.#view('player');
    for (const host of this.#hosts) host.send({ t: 'game', game: hostView });
    for (const m of this.#members.values()) if (m.peer) m.peer.send({ t: 'game', game: playerView });
    this.#sentTiles = hostView.map ? hostView.map.tiles.map((t) => JSON.stringify(t)) : [];
    this.#sentVillage = JSON.stringify(hostView.village);
    this.#sentVote = JSON.stringify(hostView.vote);
    this.#sentPlayers = JSON.stringify(hostView.players);
    this.#sentCount = hostView.playerCount;
    this.#timerDirty = false;
    for (const m of this.#members.values()) {
      if (!m.peer) continue;
      const you = this.#you(m);
      m.lastYou = JSON.stringify(you);
      m.peer.send({ t: 'you', you });
    }
  }

  /** Sends what changed since the last full view or patch. */
  #flush(): void {
    if (this.#disposed) return;
    const g = this.#game;
    const patch: Patch = { t: 'patch' };
    if (g.width > 0) {
      const changed: PublicTile[] = [];
      for (const t of g.tiles()) {
        const tile = g.publicTile(t.x, t.y)!;
        const index = t.y * g.width + t.x;
        const text = JSON.stringify(tile);
        if (this.#sentTiles[index] !== text) {
          this.#sentTiles[index] = text;
          changed.push(tile);
        }
      }
      if (changed.length > 0) patch.tiles = changed;
    }
    const village = this.#village();
    const villageText = JSON.stringify(village);
    if (villageText !== this.#sentVillage) {
      this.#sentVillage = villageText;
      patch.village = village;
    }
    const vote = this.#voteView();
    if (vote) {
      const voteText = JSON.stringify(vote);
      if (voteText !== this.#sentVote) {
        this.#sentVote = voteText;
        patch.vote = vote;
      }
    }
    if (this.playerCount !== this.#sentCount) {
      this.#sentCount = this.playerCount;
      patch.playerCount = this.#sentCount;
    }
    if (this.#timerDirty) {
      this.#timerDirty = false;
      patch.timer = this.#timerView();
    }
    const hostPatch: Patch = { ...patch };
    const players = this.#playerSummaries();
    const playersText = JSON.stringify(players);
    if (playersText !== this.#sentPlayers) {
      this.#sentPlayers = playersText;
      hostPatch.players = players;
    }
    if (Object.keys(hostPatch).length > 1) for (const host of this.#hosts) host.send(hostPatch);
    const forPlayers = Object.keys(patch).length > 1;
    for (const m of this.#members.values()) {
      if (!m.peer) continue;
      if (forPlayers) m.peer.send(patch);
      const you = this.#you(m);
      const youText = JSON.stringify(you);
      if (youText !== m.lastYou) {
        m.lastYou = youText;
        m.peer.send({ t: 'you', you });
      }
    }
  }

  /** Ticker events from the engine log since the last call. */
  #tickers(): void {
    const log = this.#game.log;
    while (this.#logCursor < log.length) {
      const event = tickerFor(log[this.#logCursor]!);
      this.#logCursor += 1;
      if (event) this.#broadcast({ t: 'ticker', event });
    }
  }

  #afterChange(): void {
    this.#flush();
    this.#tickers();
    this.#checkProgress();
  }
}

function tickerFor(entry: LogEntry): TickerEvent | null {
  switch (entry.type) {
    case 'spring-found':
      return { kind: 'spring-found' };
    case 'field-ready':
      return { kind: 'field-ready', x: entry.x, y: entry.y };
    case 'quarry-ready':
      return { kind: 'quarry-ready', x: entry.x, y: entry.y };
    case 'forest-cleared':
      return { kind: 'forest-cleared', x: entry.x, y: entry.y };
    case 'player-joined':
      return { kind: 'player-joined' };
    case 'vote-result': {
      const r = entry.result;
      if (r.outcome === 'tie') return { kind: 'tie' };
      if (r.outcome === 'built' && r.option !== undefined && r.x !== undefined && r.y !== undefined) {
        return { kind: 'built', option: r.option, x: r.x, y: r.y };
      }
      return null;
    }
    default:
      return null;
  }
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
