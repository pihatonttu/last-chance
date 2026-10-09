/**
 * Messages and view models shared by the server and the browser client.
 * Types only (plus tiny helpers); no runtime dependencies beyond the rules types.
 *
 * Transport: one WebSocket per browser tab at /ws, JSON text frames.
 * The server owns all state; clients send intents and render the views they get.
 */
import type {
  ActionPreview,
  Coord,
  Gain,
  GameLength,
  MonthReport,
  Phase,
  PlayerView,
  PublicTile,
  Refusal,
  Resources,
  VoteOption,
  VoteRefusal,
} from '@saari/rules';
import type { DebriefData } from '@saari/debrief';

export const PROTOCOL_VERSION = 1;

// ------------------------------------------------------------------ HTTP

/** POST /api/games: the teacher creates a game. No account (P14). */
export interface CreateGameRequest {
  length: GameLength;
  /** Action phase length; default 60 (design doc §4). */
  actionSeconds?: 45 | 60 | 90;
  /** Trial mode with ~20 bots, never stored (P19). */
  trial?: boolean;
}

export interface CreateGameResponse {
  /** 6-digit join code shown on the projector and in the QR code. */
  code: string;
  /** Secret that proves the teacher's browser is the host. Kept in localStorage. */
  hostToken: string;
}

/** GET /api/games/:code: lets the join page say "no such game" before asking for a nickname. */
export interface GameStatusResponse {
  exists: boolean;
  joinOpen: boolean;
  phase: Phase | null;
}

/**
 * GET /api/debriefs/:token returns the pseudonymised DebriefData (P23): no nicknames
 * ever reach the disk. DELETE /api/debriefs/:token deletes it at once (P14).
 */
export type StoredDebriefResponse = DebriefData;

// ------------------------------------------------------------------ views

export interface TimerView {
  /** Server epoch ms when the current phase ends; null in the lobby, when paused or ended. */
  phaseEndsAt: number | null;
  /** Milliseconds left in the phase (frozen while paused). */
  remainingMs: number;
  /**
   * Length of the current phase in ms, including +30 s extensions; 0 in the lobby and
   * after the end. Lets a client that joins mid-phase draw the countdown bar right.
   */
  phaseMs: number;
  paused: boolean;
}

export interface VillageView {
  resources: Resources;
  foodNeed: number;
  foodStorage: number;
  /** N this month: everyone who eats and needs shelter. */
  villagers: number;
  shelterShare: number;
  shelterCapacity: number;
  happiness: number;
  recreationThisMonth: number;
}

export interface MapView {
  width: number;
  height: number;
  landing: Coord;
  /** Row-major, width * height entries. Fogged tiles hide their terrain. */
  tiles: PublicTile[];
}

export interface VoteView {
  options: VoteOption[];
  counts: Record<string, number>;
  votesCast: number;
}

/**
 * A player as the host sees them. Students never get other players' nicknames
 * during the game (P34); they only get `playerCount`.
 */
export interface PlayerSummary {
  id: string;
  /** null when the teacher has hidden names and this view is the projector. */
  nickname: string | null;
  /** Colour token for the player's icon (from @saari/names PLAYER_COLORS). */
  color: string;
  connected: boolean;
  removed: boolean;
  /** The teacher replaced the name; the student can no longer change it (P13). */
  nameLocked: boolean;
  actionsLeft: number;
  voted: boolean;
}

export interface GameResult {
  happiness: number;
  /** 1..6 (P32); the client maps it to the grade name. */
  grade: number;
  early: boolean;
}

export interface GameView {
  code: string;
  length: GameLength;
  phase: Phase;
  month: number;
  totalMonths: number;
  timer: TimerView;
  /** New players may join (months 1-3, P33). */
  joinOpen: boolean;
  namesHidden: boolean;
  trial: boolean;
  village: VillageView;
  /** null in the lobby: the island is generated at start. */
  map: MapView | null;
  /**
   * Shown in the action phase too, so the class can plan what to build. The `blocked`
   * flags depend on wood, stone and free meadows, so the server resends this in patches
   * whenever they change during the action phase.
   */
  vote: VoteView | null;
  lastReport: MonthReport | null;
  /** Filled for the host only; empty for students. */
  players: PlayerSummary[];
  playerCount: number;
  result: GameResult | null;
}

export interface YouView extends PlayerView {
  nickname: string;
  color: string;
  /** Option id this player voted for this month, if any. */
  vote: string | null;
}

/** Ticker events for the projector and students. Never carries a nickname (P34). */
export type TickerEvent =
  | { kind: 'spring-found' }
  | { kind: 'field-ready'; x: number; y: number }
  | { kind: 'quarry-ready'; x: number; y: number }
  | { kind: 'forest-cleared'; x: number; y: number }
  | { kind: 'built'; option: string; x: number; y: number }
  | { kind: 'tie' }
  | { kind: 'player-joined' }
  | { kind: 'food-short'; missing: number };

// ------------------------------------------------------------------ client → server

export type HostCommand =
  | { type: 'start' }
  | { type: 'pause' }
  | { type: 'resume' }
  /** +30 s to the running phase. */
  | { type: 'extend' }
  /** End the game early; the debrief covers what happened so far. */
  | { type: 'end' }
  /** Replace a nickname with a random one and lock it (P13). */
  | { type: 'rename'; playerId: string }
  /** Remove a player; they cannot rejoin this game (P13). */
  | { type: 'kick'; playerId: string }
  | { type: 'hide-names'; hidden: boolean };

export type ClientMessage =
  | { t: 'hello-host'; protocol: number; code: string; hostToken: string }
  /**
   * Join or rejoin. Rejoin with `playerToken` (same browser) or with the same
   * nickname when that player is disconnected (P23).
   */
  | { t: 'hello-player'; protocol: number; code: string; nickname?: string; playerToken?: string }
  | { t: 'inspect'; x: number; y: number }
  | { t: 'act'; x: number; y: number }
  | { t: 'vote'; option: string }
  | { t: 'host'; command: HostCommand }
  | { t: 'ping' };

// ------------------------------------------------------------------ server → client

export type JoinRefusal =
  | 'unknown-game'
  | 'join-closed'
  | 'game-ended'
  | 'nickname-invalid'
  | 'nickname-offensive'
  | 'nickname-taken'
  | 'kicked'
  | 'bad-token'
  | 'protocol-mismatch';

/**
 * Why the server rejected a message. Clients translate these (P17); the server never
 * sends free text.
 */
export type ErrorCode =
  | 'bad-message'
  | 'server-error'
  | 'not-joined'
  | 'already-joined'
  | 'unexpected-message'
  | 'game-closed'
  | 'replaced'
  | 'not-a-player'
  | 'not-host'
  | 'wrong-phase'
  | 'no-players'
  | 'unknown-player';

export type ServerMessage =
  | {
      t: 'welcome';
      role: 'host' | 'player';
      game: GameView;
      you: YouView | null;
      /** Players store this in localStorage to rejoin after a reload. */
      playerToken?: string;
      serverTime: number;
    }
  | { t: 'refused-join'; reason: JoinRefusal }
  /** Full view: sent on phase changes, pause/resume and other big changes. */
  | { t: 'game'; game: GameView }
  /** Small changes inside a phase. Missing fields are unchanged. */
  | {
      t: 'patch';
      tiles?: PublicTile[];
      village?: VillageView;
      vote?: VoteView;
      players?: PlayerSummary[];
      playerCount?: number;
      timer?: TimerView;
    }
  | { t: 'you'; you: YouView }
  | { t: 'preview'; x: number; y: number; preview: ActionPreview }
  | { t: 'act-result'; x: number; y: number; ok: true; gain: Gain }
  | { t: 'act-result'; x: number; y: number; ok: false; reason: Refusal }
  | { t: 'vote-result'; ok: true }
  | { t: 'vote-result'; ok: false; reason: VoteRefusal }
  /**
   * Someone else's action at a tile, for the floating "+10 puuta". No names (P34). The
   * acting player gets `act-result` instead and builds its own effect from it.
   */
  | { t: 'effect'; x: number; y: number; gain: Gain }
  | { t: 'ticker'; event: TickerEvent }
  /**
   * Host only, when the game ends: the named debrief to print or save on the
   * teacher's own device (P23), and the link to the stored pseudonymised copy.
   */
  | { t: 'debrief'; debrief: DebriefData; storedToken: string | null }
  | { t: 'kicked' }
  | { t: 'error'; code: ErrorCode }
  | { t: 'pong'; serverTime: number };

// ------------------------------------------------------------------ helpers

export function encode(message: ClientMessage | ServerMessage): string {
  return JSON.stringify(message);
}

/** Parses a frame; returns null for anything that is not an object with a string `t`. */
export function decode<T extends { t: string }>(frame: string): T | null {
  try {
    const value: unknown = JSON.parse(frame);
    if (typeof value === 'object' && value !== null && typeof (value as { t?: unknown }).t === 'string') {
      return value as T;
    }
  } catch {
    // fall through
  }
  return null;
}
