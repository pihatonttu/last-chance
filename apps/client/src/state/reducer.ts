/**
 * Client state as a pure reducer over server messages. No DOM, no timers: `now` is
 * passed in so the reducer is unit-testable and the Svelte layer only stores results.
 */
import type { DebriefData } from '@saari/debrief';
import type { GameView, JoinRefusal, ServerMessage, TickerEvent, TimerView, YouView } from '@saari/protocol';
import type { ActionPreview, Gain, PublicTile, Refusal, VoteRefusal } from '@saari/rules';

export type ConnectionStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed';

export interface FloatingEffect {
  id: number;
  x: number;
  y: number;
  gain: Gain;
  at: number;
}

export interface TickerItem {
  id: number;
  event: TickerEvent;
  month: number;
  at: number;
}

export type ActOutcome =
  | { id: number; x: number; y: number; ok: true; gain: Gain }
  | { id: number; x: number; y: number; ok: false; reason: Refusal };

export type VoteOutcome = { id: number; ok: true; option: string | null } | { id: number; ok: false; reason: VoteRefusal };

export interface ClientState {
  status: ConnectionStatus;
  /** True once a welcome arrived on this page; the reconnect banner needs it. */
  welcomed: boolean;
  role: 'host' | 'player' | null;
  game: GameView | null;
  you: YouView | null;
  playerToken: string | null;
  joinRefusal: JoinRefusal | null;
  kicked: boolean;
  /** serverTime − local time, from welcome and pong. */
  clockOffset: number;
  /** `${month}:${phase}`; the countdown bar resets when it changes. */
  phaseKey: string;
  /** Longest remaining time seen in this phase: the bar's 100 % (TimerView has no duration). */
  phaseTotalMs: number;
  preview: { x: number; y: number; preview: ActionPreview } | null;
  lastAct: ActOutcome | null;
  /** The option this client sent last; vote-result does not echo it. */
  pendingVote: string | null;
  lastVote: VoteOutcome | null;
  effects: FloatingEffect[];
  ticker: TickerItem[];
  debrief: DebriefData | null;
  storedToken: string | null;
  error: string | null;
  nextId: number;
}

/** Floating effects older than this are dropped from state (the renderer animates them). */
export const EFFECT_TTL_MS = 4000;
export const MAX_EFFECTS = 60;
export const MAX_TICKER = 12;

export function initialState(): ClientState {
  return {
    status: 'idle',
    welcomed: false,
    role: null,
    game: null,
    you: null,
    playerToken: null,
    joinRefusal: null,
    kicked: false,
    clockOffset: 0,
    phaseKey: '',
    phaseTotalMs: 0,
    preview: null,
    lastAct: null,
    pendingVote: null,
    lastVote: null,
    effects: [],
    ticker: [],
    debrief: null,
    storedToken: null,
    error: null,
    nextId: 1,
  };
}

function phaseKeyOf(game: GameView): string {
  return `${game.month}:${game.phase}`;
}

function withTimer(state: ClientState, game: GameView): Pick<ClientState, 'phaseKey' | 'phaseTotalMs'> {
  const key = phaseKeyOf(game);
  const remaining = game.timer.remainingMs;
  if (key !== state.phaseKey) return { phaseKey: key, phaseTotalMs: remaining };
  return { phaseKey: key, phaseTotalMs: Math.max(state.phaseTotalMs, remaining) };
}

function mergeTiles(game: GameView, tiles: readonly PublicTile[]): GameView {
  if (!game.map || tiles.length === 0) return game;
  const { width, height } = game.map;
  const next = game.map.tiles.slice();
  for (const tile of tiles) {
    if (tile.x < 0 || tile.y < 0 || tile.x >= width || tile.y >= height) continue;
    next[tile.y * width + tile.x] = tile;
  }
  return { ...game, map: { ...game.map, tiles: next } };
}

function pruneEffects(effects: readonly FloatingEffect[], now: number): FloatingEffect[] {
  const fresh = effects.filter((e) => now - e.at < EFFECT_TTL_MS);
  return fresh.length > MAX_EFFECTS ? fresh.slice(fresh.length - MAX_EFFECTS) : fresh;
}

/** Applies one server message. Returns the same object when nothing changed. */
export function applyServerMessage(state: ClientState, msg: ServerMessage, now: number): ClientState {
  const effects = pruneEffects(state.effects, now);
  const base = effects.length === state.effects.length ? state : { ...state, effects };

  switch (msg.t) {
    case 'welcome': {
      const phaseChanged = phaseKeyOf(msg.game) !== state.phaseKey;
      return {
        ...base,
        welcomed: true,
        role: msg.role,
        game: msg.game,
        you: msg.you,
        playerToken: msg.playerToken ?? state.playerToken,
        joinRefusal: null,
        kicked: false,
        error: null,
        clockOffset: msg.serverTime - now,
        preview: phaseChanged ? null : state.preview,
        ...withTimer(state, msg.game),
      };
    }
    case 'refused-join':
      return { ...base, joinRefusal: msg.reason };
    case 'game': {
      const phaseChanged = phaseKeyOf(msg.game) !== state.phaseKey;
      return {
        ...base,
        game: msg.game,
        preview: phaseChanged ? null : state.preview,
        pendingVote: phaseChanged ? null : state.pendingVote,
        ...withTimer(state, msg.game),
      };
    }
    case 'patch': {
      if (!state.game) return base;
      let game: GameView = state.game;
      if (msg.tiles) game = mergeTiles(game, msg.tiles);
      if (msg.village) game = { ...game, village: msg.village };
      if (msg.vote) game = { ...game, vote: msg.vote };
      if (msg.players) game = { ...game, players: msg.players };
      if (msg.playerCount !== undefined) game = { ...game, playerCount: msg.playerCount };
      if (msg.timer) game = { ...game, timer: msg.timer };
      return { ...base, game, ...withTimer(state, game) };
    }
    case 'you':
      return { ...base, you: msg.you };
    case 'preview':
      return { ...base, preview: { x: msg.x, y: msg.y, preview: msg.preview } };
    case 'act-result': {
      const id = state.nextId;
      if (!msg.ok) {
        return { ...base, lastAct: { id, x: msg.x, y: msg.y, ok: false, reason: msg.reason }, nextId: id + 1 };
      }
      // The server sends 'effect' to everyone else; the actor's own float comes from here.
      const effect: FloatingEffect = { id: id + 1, x: msg.x, y: msg.y, gain: msg.gain, at: now };
      return {
        ...base,
        lastAct: { id, x: msg.x, y: msg.y, ok: true, gain: msg.gain },
        effects: [...base.effects, effect],
        nextId: id + 2,
      };
    }
    case 'vote-result': {
      const id = state.nextId;
      if (!msg.ok) return { ...base, lastVote: { id, ok: false, reason: msg.reason }, pendingVote: null, nextId: id + 1 };
      const option = state.pendingVote;
      const you = state.you && option !== null ? { ...state.you, vote: option } : state.you;
      return { ...base, you, lastVote: { id, ok: true, option }, pendingVote: null, nextId: id + 1 };
    }
    case 'effect': {
      const id = state.nextId;
      return {
        ...base,
        effects: [...base.effects, { id, x: msg.x, y: msg.y, gain: msg.gain, at: now }],
        nextId: id + 1,
      };
    }
    case 'ticker': {
      const id = state.nextId;
      const item: TickerItem = { id, event: msg.event, month: state.game?.month ?? 0, at: now };
      const ticker = [...state.ticker, item];
      return {
        ...base,
        ticker: ticker.length > MAX_TICKER ? ticker.slice(ticker.length - MAX_TICKER) : ticker,
        nextId: id + 1,
      };
    }
    case 'debrief':
      return { ...base, debrief: msg.debrief, storedToken: msg.storedToken };
    case 'kicked':
      return { ...base, kicked: true };
    case 'error':
      return { ...base, error: msg.message };
    case 'pong':
      return { ...base, clockOffset: msg.serverTime - now };
  }
}

/** Local events that are not server messages. */
export type LocalEvent =
  | { type: 'status'; status: ConnectionStatus }
  | { type: 'vote-sent'; option: string }
  | { type: 'clear-error' }
  | { type: 'clear-refusal' };

export function applyLocal(state: ClientState, event: LocalEvent): ClientState {
  switch (event.type) {
    case 'status':
      return state.status === event.status ? state : { ...state, status: event.status };
    case 'vote-sent':
      return { ...state, pendingVote: event.option };
    case 'clear-error':
      return state.error === null ? state : { ...state, error: null };
    case 'clear-refusal':
      return state.joinRefusal === null ? state : { ...state, joinRefusal: null };
  }
}

/** Milliseconds left in the phase as the client sees it now. */
export function remainingMs(timer: TimerView, clockOffset: number, now: number): number {
  if (timer.paused || timer.phaseEndsAt === null) return Math.max(0, timer.remainingMs);
  return Math.max(0, timer.phaseEndsAt - (now + clockOffset));
}

/** 0..1 share of the phase left, for the countdown bar. */
export function remainingShare(state: Pick<ClientState, 'phaseTotalMs' | 'clockOffset'>, timer: TimerView, now: number): number {
  if (state.phaseTotalMs <= 0) return 0;
  return Math.min(1, remainingMs(timer, state.clockOffset, now) / state.phaseTotalMs);
}

export function tileAt(game: GameView | null, x: number, y: number): PublicTile | null {
  const map = game?.map;
  if (!map || x < 0 || y < 0 || x >= map.width || y >= map.height) return null;
  return map.tiles[y * map.width + x] ?? null;
}
