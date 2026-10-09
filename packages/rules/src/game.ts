import { chebyshev, inBounds, indexOf, neighbors8, type Coord } from './grid.ts';
import {
  DEFAULT_PARAMS,
  type BuildingKind,
  type Cost,
  type GameLength,
  type GameParams,
  type Level,
} from './params.ts';
import type { MapGenParams, Terrain, TerrainMap } from './types.ts';

export type Phase = 'lobby' | 'action' | 'vote' | 'summary' | 'ended';
export type TerrainGenerator = (seed: number, villagers: number, params: MapGenParams) => TerrainMap;

export interface Building {
  kind: BuildingKind;
  level: Level;
}

export interface Tile {
  readonly x: number;
  readonly y: number;
  terrain: Terrain;
  fog: boolean;
  /** Exploration progress while fogged. */
  exploreWork: number;
  /** Plowing (meadow) or quarry building (rock) progress. */
  work: number;
  /** Wood (forest), food (field) or stone (quarry) left. */
  stock: number;
  /** Recreation uses this month (spring, gathering place). */
  uses: number;
  building: Building | null;
}

/** What a client may see of a tile: nothing under the fog except exploration progress. */
export interface PublicTile {
  x: number;
  y: number;
  fog: boolean;
  exploreWork: number;
  terrain: Terrain | null;
  building: Building | null;
  stock: number | null;
  work: number | null;
  uses: number | null;
}

export interface Resources {
  food: number;
  wood: number;
  stone: number;
}

export type Skill = 'education' | 'tools';

export type ActionKind =
  | 'explore'
  | 'plow'
  | 'harvest'
  | 'fish'
  | 'chop'
  | 'build-quarry'
  | 'mine'
  | 'swim'
  | 'gather'
  | 'study'
  | 'make-tools';

export type Refusal =
  | 'unknown-player'
  | 'removed'
  | 'wrong-phase'
  | 'out-of-bounds'
  | 'no-actions-left'
  | 'not-explorable'
  | 'deep-sea'
  | 'field-empty'
  | 'quarry-empty'
  | 'no-uses-left'
  | 'max-level'
  | 'no-action';

export type Yield =
  | { type: 'resource'; resource: keyof Resources; amount: number }
  | { type: 'work'; amount: number; done: number; needed: number }
  | { type: 'recreation'; usesLeft: number; capacity: number }
  | { type: 'progress'; skill: Skill; amount: number; done: number; needed: number; level: number }
  | { type: 'none' };

export interface ActionPreview {
  kind: ActionKind | null;
  available: boolean;
  reason?: Refusal;
  yield: Yield;
}

export interface Gain {
  food?: number;
  wood?: number;
  stone?: number;
  work?: number;
  recreation?: number;
  education?: number;
  tools?: number;
}

export type ActResult = { ok: true; events: LogEntry[] } | { ok: false; reason: Refusal };

export type VoteBlock = 'wood' | 'stone' | 'space';

export interface VoteOption {
  /** 'none', or `${kind}-${level}` such as 'shelter-1', 'school-2'. */
  id: string;
  kind: BuildingKind | 'none';
  level: 0 | Level;
  /** True when the option raises an existing building instead of placing a new one. */
  upgrade: boolean;
  cost: Cost;
  blocked: VoteBlock[];
}

export type VoteRefusal = 'wrong-phase' | 'unknown-player' | 'removed' | 'unknown-option' | 'blocked';
export type VoteCastResult = { ok: true } | { ok: false; reason: VoteRefusal };

export interface VoteResolution {
  outcome: 'built' | 'tie' | 'none' | 'no-votes';
  counts: Record<string, number>;
  option?: string;
  x?: number;
  y?: number;
}

export interface MonthReport {
  month: number;
  villagers: number;
  vote: VoteResolution;
  food: { before: number; need: number; eaten: number; hungry: number; spoiled: number; after: number };
  shelter: { capacity: number; unsheltered: number };
  recreation: number;
  mood: { food: number; shelter: number; recreation: number; total: number };
  /** Running total after this month. */
  happiness: number;
  unusedActions: number;
}

export type JoinResult = { ok: true } | { ok: false; reason: 'duplicate' | 'join-closed' | 'game-ended' };

export type TeacherAction = 'pause' | 'resume' | 'extend';

export type LogEvent =
  | { type: 'player-joined'; player: string; countsFromMonth: number }
  | { type: 'player-removed'; player: string }
  | { type: 'player-connection'; player: string; connected: boolean }
  | { type: 'game-started'; seed: number; length: GameLength; villagers: number; width: number; height: number }
  | { type: 'phase'; to: Phase }
  | { type: 'action'; player: string; kind: ActionKind; x: number; y: number; gain: Gain }
  | { type: 'tile-revealed'; x: number; y: number; terrain: Terrain; player: string | null }
  | { type: 'spring-found'; x: number; y: number; player: string }
  | { type: 'field-ready' | 'quarry-ready' | 'forest-cleared'; x: number; y: number; player: string }
  | { type: 'level-up'; player: string; skill: Skill; level: number }
  | { type: 'actions-unused'; player: string; count: number }
  | { type: 'vote'; player: string; option: string; previous: string | null }
  | { type: 'vote-result'; result: VoteResolution }
  | { type: 'month-end'; report: MonthReport }
  | { type: 'game-ended'; early: boolean; happiness: number; grade: number }
  | { type: 'teacher'; action: TeacherAction };

export type LogEntry = LogEvent & { seq: number; t: number; month: number; phase: Phase };

export interface PlayerView {
  id: string;
  education: number;
  educationProgress: number;
  tools: number;
  toolsProgress: number;
  maxActions: number;
  actionsLeft: number;
  countsFromMonth: number;
  removed: boolean;
  connected: boolean;
}

export interface GameOptions {
  seed: number;
  length: GameLength;
  params?: GameParams;
  /** A ready terrain (tests). Otherwise `generate` builds one at start(). */
  terrain?: TerrainMap;
  generate?: TerrainGenerator;
  /** Milliseconds for log timestamps; the server injects its clock. */
  clock?: () => number;
}

interface Player {
  id: string;
  countsFromMonth: number;
  removed: boolean;
  connected: boolean;
  education: number;
  educationProgress: number;
  tools: number;
  toolsProgress: number;
  actionsUsed: number;
}

interface Plan {
  kind: ActionKind | null;
  yield: Yield;
  refusal?: Refusal;
  perform?: (player: Player) => Gain;
}

const EPSILON = 1e-9;

/** The whole rules engine for one game. Deterministic; the server drives the phases. */
export class Game {
  readonly seed: number;
  readonly length: GameLength;
  readonly params: GameParams;

  #phase: Phase = 'lobby';
  #month = 0;
  #villagers = 0;
  #happiness = 0;
  #resources: Resources = { food: 0, wood: 0, stone: 0 };
  #recreation = 0;
  #unused = 0;
  #width = 0;
  #height = 0;
  #landing: Coord = { x: 0, y: 0 };
  #tiles: Tile[] = [];
  #players = new Map<string, Player>();
  #votes = new Map<string, string>();
  #log: LogEntry[] = [];
  #reports: MonthReport[] = [];
  #terrain: TerrainMap | undefined;
  #generate: TerrainGenerator | undefined;
  #clock: () => number;

  constructor(options: GameOptions) {
    this.seed = options.seed;
    this.length = options.length;
    this.params = options.params ?? DEFAULT_PARAMS;
    this.#terrain = options.terrain;
    this.#generate = options.generate;
    this.#clock = options.clock ?? (() => 0);
  }

  // ---------------------------------------------------------------- state

  get phase(): Phase {
    return this.#phase;
  }

  get month(): number {
    return this.#month;
  }

  get totalMonths(): number {
    return this.params.months[this.length];
  }

  /** Villagers this month: everyone who eats and needs shelter (N). */
  get villagers(): number {
    return this.#villagers;
  }

  get happiness(): number {
    return this.#happiness;
  }

  get resources(): Resources {
    return { ...this.#resources };
  }

  get recreationThisMonth(): number {
    return this.#recreation;
  }

  get width(): number {
    return this.#width;
  }

  get height(): number {
    return this.#height;
  }

  get landing(): Coord {
    return { ...this.#landing };
  }

  get log(): readonly LogEntry[] {
    return this.#log;
  }

  get reports(): readonly MonthReport[] {
    return this.#reports;
  }

  tiles(): readonly Readonly<Tile>[] {
    return this.#tiles;
  }

  tile(x: number, y: number): Readonly<Tile> | undefined {
    return this.#tileAt({ x, y });
  }

  publicTile(x: number, y: number): PublicTile | undefined {
    const t = this.#tileAt({ x, y });
    if (!t) return undefined;
    const hidden = t.fog;
    return {
      x: t.x,
      y: t.y,
      fog: t.fog,
      exploreWork: t.exploreWork,
      terrain: hidden ? null : t.terrain,
      building: hidden ? null : t.building,
      stock: hidden ? null : t.stock,
      work: hidden ? null : t.work,
      uses: hidden ? null : t.uses,
    };
  }

  playerIds(): string[] {
    return [...this.#players.keys()];
  }

  player(id: string): PlayerView | undefined {
    const p = this.#players.get(id);
    if (!p) return undefined;
    const max = this.#maxActions(p);
    return {
      id: p.id,
      education: p.education,
      educationProgress: p.educationProgress,
      tools: p.tools,
      toolsProgress: p.toolsProgress,
      maxActions: max,
      actionsLeft: Math.max(0, max - p.actionsUsed),
      countsFromMonth: p.countsFromMonth,
      removed: p.removed,
      connected: p.connected,
    };
  }

  /** Food the village eats at the end of this month. */
  foodNeed(): number {
    return this.params.foodPerVillager * this.#n();
  }

  /** Most food the storage keeps over a month end; the rest spoils. */
  foodStorage(): number {
    return this.params.foodStorageMonths * this.foodNeed();
  }

  /** Shelter places for this month's villager count. */
  shelterCapacity(): number {
    const n = this.#n();
    return this.#tiles
      .filter((t) => t.building?.kind === 'shelter')
      .reduce((sum, t) => sum + Math.ceil(n / this.params.shelterDivisors[t.building!.level - 1]!), 0);
  }

  /** Grade 1..6: how many thresholds the happiness reaches, scaled for short games. */
  grade(): number {
    const scale = this.totalMonths / this.params.months.normal;
    return 1 + this.params.gradeThresholds.filter((t) => this.#happiness >= t * scale).length;
  }

  // ---------------------------------------------------------------- players

  addPlayer(id: string): JoinResult {
    if (this.#players.has(id)) return { ok: false, reason: 'duplicate' };
    if (this.#phase === 'ended') return { ok: false, reason: 'game-ended' };
    if (this.#phase !== 'lobby' && this.#month >= this.params.joinClosesAtMonth) {
      return { ok: false, reason: 'join-closed' };
    }
    const countsFromMonth = this.#phase === 'lobby' ? 1 : this.#month + 1;
    this.#players.set(id, {
      id,
      countsFromMonth,
      removed: false,
      connected: true,
      education: 1,
      educationProgress: 0,
      tools: 1,
      toolsProgress: 0,
      actionsUsed: 0,
    });
    this.#emit({ type: 'player-joined', player: id, countsFromMonth });
    return { ok: true };
  }

  /** Teacher removes a player. They stop counting as a villager from next month. */
  removePlayer(id: string): void {
    const p = this.#players.get(id);
    if (!p || p.removed) return;
    p.removed = true;
    this.#votes.delete(id);
    this.#emit({ type: 'player-removed', player: id });
  }

  setConnected(id: string, connected: boolean): void {
    const p = this.#players.get(id);
    if (!p || p.connected === connected) return;
    p.connected = connected;
    this.#emit({ type: 'player-connection', player: id, connected });
  }

  logTeacher(action: TeacherAction): void {
    this.#emit({ type: 'teacher', action });
  }

  // ---------------------------------------------------------------- flow

  start(): void {
    if (this.#phase !== 'lobby') throw new Error('game already started');
    const players = [...this.#players.values()].filter((p) => !p.removed);
    if (players.length === 0) throw new Error('cannot start without players');

    this.#month = 1;
    this.#villagers = this.#countVillagers();
    const terrain = this.#terrain ?? this.#generate?.(this.seed, this.#villagers, this.params.map);
    if (!terrain) throw new Error('no terrain and no generator');
    this.#buildTiles(terrain);

    const n = this.#n();
    this.#resources = {
      food: this.params.startFoodPerVillager * n,
      wood: this.#roundPrice(this.params.startWoodPerVillager * n),
      stone: this.params.startStone,
    };
    this.#emit({
      type: 'game-started',
      seed: this.seed,
      length: this.length,
      villagers: this.#villagers,
      width: this.#width,
      height: this.#height,
    });
    this.#setPhase('action');
  }

  endActionPhase(): void {
    this.#expectPhase('action');
    this.#unused = 0;
    for (const p of this.#players.values()) {
      if (p.removed) continue;
      const count = Math.max(0, this.#maxActions(p) - p.actionsUsed);
      if (count > 0) {
        this.#unused += count;
        this.#emit({ type: 'actions-unused', player: p.id, count });
      }
    }
    this.#setPhase('vote');
  }

  /** Resolves the vote and the month end (food, shelter, mood, nature). */
  endVotePhase(): MonthReport {
    this.#expectPhase('vote');
    const vote = this.#resolveVote();
    const report = this.#endOfMonth(vote);
    this.#reports.push(report);
    this.#emit({ type: 'month-end', report });
    this.#setPhase('summary');
    return report;
  }

  nextMonth(): void {
    this.#expectPhase('summary');
    if (this.#month >= this.totalMonths) {
      this.#end(false);
      return;
    }
    this.#month += 1;
    this.#villagers = this.#countVillagers();
    this.#votes.clear();
    for (const p of this.#players.values()) p.actionsUsed = 0;
    this.#setPhase('action');
  }

  endEarly(): void {
    if (this.#phase === 'ended') return;
    this.#end(true);
  }

  /** Every connected, non-removed player has used all actions. */
  allActionsUsed(): boolean {
    return this.#present().every((p) => p.actionsUsed >= this.#maxActions(p));
  }

  /** Every connected, non-removed player has voted. */
  allVoted(): boolean {
    return this.#present().every((p) => this.#votes.has(p.id));
  }

  // ---------------------------------------------------------------- actions

  preview(playerId: string, x: number, y: number): ActionPreview {
    const p = this.#players.get(playerId);
    const tile = this.#tileAt({ x, y });
    if (!p) return { kind: null, available: false, reason: 'unknown-player', yield: { type: 'none' } };
    if (!tile) return { kind: null, available: false, reason: 'out-of-bounds', yield: { type: 'none' } };
    const plan = this.#plan(p, tile);
    const reason = this.#refusal(p, plan);
    return reason === undefined
      ? { kind: plan.kind, available: true, yield: plan.yield }
      : { kind: plan.kind, available: false, reason, yield: plan.yield };
  }

  act(playerId: string, x: number, y: number): ActResult {
    const p = this.#players.get(playerId);
    if (!p) return { ok: false, reason: 'unknown-player' };
    const tile = this.#tileAt({ x, y });
    if (!tile) return { ok: false, reason: 'out-of-bounds' };
    const plan = this.#plan(p, tile);
    const reason = this.#refusal(p, plan);
    if (reason !== undefined || !plan.perform || plan.kind === null) {
      return { ok: false, reason: reason ?? 'no-action' };
    }
    const first = this.#log.length;
    p.actionsUsed += 1;
    const actionEntry = this.#emit({ type: 'action', player: p.id, kind: plan.kind, x, y, gain: {} });
    const gain = plan.perform(p);
    if (actionEntry.type === 'action') actionEntry.gain = gain;
    return { ok: true, events: this.#log.slice(first) };
  }

  #refusal(p: Player, plan: Plan): Refusal | undefined {
    if (p.removed) return 'removed';
    if (this.#phase !== 'action') return 'wrong-phase';
    if (p.actionsUsed >= this.#maxActions(p)) return 'no-actions-left';
    return plan.refusal;
  }

  #plan(p: Player, tile: Tile): Plan {
    const m = this.#toolsMultiplier(p);
    if (tile.fog) return this.#planExplore(tile, m);
    if (tile.building) return this.#planBuilding(p, tile);
    const P = this.params;
    switch (tile.terrain) {
      case 'sea': {
        const amount = Math.round(P.fishYield * m);
        const coastal = this.#around(tile).some((n) => n.terrain !== 'sea');
        return {
          kind: 'fish',
          yield: { type: 'resource', resource: 'food', amount },
          ...(coastal ? {} : { refusal: 'deep-sea' as const }),
          perform: () => this.#add('food', amount),
        };
      }
      case 'meadow':
        return this.#planWork(tile, 'plow', m, P.plowWork, (player) => {
          tile.terrain = 'field';
          tile.stock = P.fieldCapacity;
          this.#emit({ type: 'field-ready', x: tile.x, y: tile.y, player: player.id });
        });
      case 'rock':
        return this.#planWork(tile, 'build-quarry', m, P.quarryWork, (player) => {
          tile.terrain = 'quarry';
          tile.stock = P.quarryCapacity;
          this.#emit({ type: 'quarry-ready', x: tile.x, y: tile.y, player: player.id });
        });
      case 'field': {
        const amount = Math.min(tile.stock, Math.round(P.harvestYield * m));
        return {
          kind: 'harvest',
          yield: { type: 'resource', resource: 'food', amount },
          ...(tile.stock <= 0 ? { refusal: 'field-empty' as const } : {}),
          perform: () => {
            tile.stock -= amount;
            return this.#add('food', amount);
          },
        };
      }
      case 'forest': {
        const amount = Math.min(tile.stock, Math.round(P.chopYield * m));
        return {
          kind: 'chop',
          yield: { type: 'resource', resource: 'wood', amount },
          perform: (player) => {
            tile.stock -= amount;
            if (tile.stock <= 0) {
              tile.stock = 0;
              tile.terrain = 'meadow';
              tile.work = 0;
              this.#emit({ type: 'forest-cleared', x: tile.x, y: tile.y, player: player.id });
            }
            return this.#add('wood', amount);
          },
        };
      }
      case 'quarry': {
        const scaled = Math.round((P.mineYield * m * tile.stock) / P.quarryCapacity);
        const amount = Math.min(tile.stock, Math.max(P.mineMinYield, scaled));
        return {
          kind: 'mine',
          yield: { type: 'resource', resource: 'stone', amount },
          ...(tile.stock <= 0 ? { refusal: 'quarry-empty' as const } : {}),
          perform: () => {
            tile.stock -= amount;
            return this.#add('stone', amount);
          },
        };
      }
      case 'spring':
        return this.#planRecreation(tile, 'swim', Math.ceil(this.#n() / P.springDivisor));
    }
  }

  #planExplore(tile: Tile, m: number): Plan {
    const needed = this.#exploreNeeded(tile);
    const explorable = this.#around(tile).some((n) => !n.fog);
    return {
      kind: 'explore',
      yield: { type: 'work', amount: m, done: tile.exploreWork, needed },
      ...(explorable ? {} : { refusal: 'not-explorable' as const }),
      perform: (player) => {
        tile.exploreWork += m;
        if (tile.exploreWork + EPSILON >= needed) this.#reveal(tile, player.id);
        return { work: m };
      },
    };
  }

  #planWork(tile: Tile, kind: ActionKind, m: number, needed: number, complete: (p: Player) => void): Plan {
    return {
      kind,
      yield: { type: 'work', amount: m, done: tile.work, needed },
      perform: (player) => {
        tile.work += m;
        if (tile.work + EPSILON >= needed) {
          tile.work = 0;
          complete(player);
        }
        return { work: m };
      },
    };
  }

  #planRecreation(tile: Tile, kind: ActionKind, capacity: number): Plan {
    return {
      kind,
      yield: { type: 'recreation', usesLeft: Math.max(0, capacity - tile.uses), capacity },
      ...(tile.uses >= capacity ? { refusal: 'no-uses-left' as const } : {}),
      perform: () => {
        tile.uses += 1;
        this.#recreation += 1;
        return { recreation: 1 };
      },
    };
  }

  #planBuilding(p: Player, tile: Tile): Plan {
    const b = tile.building!;
    switch (b.kind) {
      case 'shelter':
        return { kind: null, yield: { type: 'none' }, refusal: 'no-action' };
      case 'gathering':
        return this.#planRecreation(tile, 'gather', Math.ceil(this.#n() / this.params.gatheringDivisors[b.level - 1]!));
      case 'school':
        return this.#planSkill(p, 'education', 'study', b.level);
      case 'workshop':
        return this.#planSkill(p, 'tools', 'make-tools', b.level);
    }
  }

  #planSkill(p: Player, skill: Skill, kind: ActionKind, buildingLevel: number): Plan {
    const level = skill === 'education' ? p.education : p.tools;
    const done = skill === 'education' ? p.educationProgress : p.toolsProgress;
    const needed = this.params.skillProgressPerLevel * level;
    return {
      kind,
      yield: { type: 'progress', skill, amount: buildingLevel, done, needed, level },
      ...(level >= this.params.maxSkillLevel ? { refusal: 'max-level' as const } : {}),
      perform: (player) => {
        this.#addProgress(player, skill, buildingLevel);
        return skill === 'education' ? { education: buildingLevel } : { tools: buildingLevel };
      },
    };
  }

  #addProgress(p: Player, skill: Skill, amount: number): void {
    const max = this.params.maxSkillLevel;
    const perLevel = this.params.skillProgressPerLevel;
    let level = skill === 'education' ? p.education : p.tools;
    let progress = (skill === 'education' ? p.educationProgress : p.toolsProgress) + amount;
    while (level < max && progress >= perLevel * level) {
      progress -= perLevel * level;
      level += 1;
      this.#emit({ type: 'level-up', player: p.id, skill, level });
    }
    if (level >= max) progress = 0;
    if (skill === 'education') {
      p.education = level;
      p.educationProgress = progress;
    } else {
      p.tools = level;
      p.toolsProgress = progress;
    }
  }

  #reveal(tile: Tile, player: string | null): void {
    tile.fog = false;
    this.#emit({ type: 'tile-revealed', x: tile.x, y: tile.y, terrain: tile.terrain, player });
    if (tile.terrain === 'spring' && player !== null) {
      this.#emit({ type: 'spring-found', x: tile.x, y: tile.y, player });
    }
    if (tile.terrain !== 'sea') this.#revealSeaAround(tile, player);
  }

  #revealSeaAround(tile: Tile, player: string | null): void {
    for (const n of this.#around(tile)) {
      if (n.fog && n.terrain === 'sea') {
        n.fog = false;
        this.#emit({ type: 'tile-revealed', x: n.x, y: n.y, terrain: n.terrain, player });
      }
    }
  }

  #exploreNeeded(tile: Tile): number {
    const d = chebyshev(tile, this.#landing);
    return this.params.exploreBase + Math.floor(d / this.params.exploreDistanceDivisor);
  }

  #add(resource: keyof Resources, amount: number): Gain {
    this.#resources[resource] += amount;
    return { [resource]: amount };
  }

  #toolsMultiplier(p: Player): number {
    return 1 + this.params.toolsBonusPerLevel * (p.tools - 1);
  }

  #maxActions(p: Player): number {
    return this.params.baseActions + (p.education - 1);
  }

  // ---------------------------------------------------------------- votes

  voteOptions(): VoteOption[] {
    const options: VoteOption[] = [{ id: 'none', kind: 'none', level: 0, upgrade: false, cost: { wood: 0, stone: 0 }, blocked: [] }];
    const built = this.#tiles.filter((t) => t.building !== null);
    const shelters = built.filter((t) => t.building!.kind === 'shelter');
    options.push(this.#option('shelter', 1, false));
    if (shelters.some((t) => t.building!.level === 1)) options.push(this.#option('shelter', 2, true));
    if (shelters.some((t) => t.building!.level === 2)) options.push(this.#option('shelter', 3, true));
    if (shelters.length > 0) {
      for (const kind of ['school', 'workshop', 'gathering'] as const) {
        const existing = built.find((t) => t.building!.kind === kind);
        if (!existing) options.push(this.#option(kind, 1, false));
        else if (existing.building!.level < 3) {
          options.push(this.#option(kind, (existing.building!.level + 1) as Level, true));
        }
      }
    }
    return options;
  }

  vote(playerId: string, optionId: string): VoteCastResult {
    if (this.#phase !== 'vote') return { ok: false, reason: 'wrong-phase' };
    const p = this.#players.get(playerId);
    if (!p) return { ok: false, reason: 'unknown-player' };
    if (p.removed) return { ok: false, reason: 'removed' };
    const option = this.voteOptions().find((o) => o.id === optionId);
    if (!option) return { ok: false, reason: 'unknown-option' };
    if (option.blocked.length > 0) return { ok: false, reason: 'blocked' };
    const previous = this.#votes.get(playerId) ?? null;
    this.#votes.set(playerId, optionId);
    this.#emit({ type: 'vote', player: playerId, option: optionId, previous });
    return { ok: true };
  }

  /** Votes per current option, in option order. */
  voteCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const o of this.voteOptions()) counts[o.id] = 0;
    for (const option of this.#votes.values()) {
      if (option in counts) counts[option] = (counts[option] ?? 0) + 1;
    }
    return counts;
  }

  #option(kind: BuildingKind, level: Level, upgrade: boolean): VoteOption {
    const perVillager = this.params.costs[kind][level - 1]!;
    const cost = {
      wood: this.#roundPrice(perVillager.wood * this.#n()),
      stone: this.#roundPrice(perVillager.stone * this.#n()),
    };
    const blocked: VoteBlock[] = [];
    if (this.#resources.wood < cost.wood) blocked.push('wood');
    if (this.#resources.stone < cost.stone) blocked.push('stone');
    if (!upgrade && !this.#freeMeadow()) blocked.push('space');
    return { id: `${kind}-${level}`, kind, level, upgrade, cost, blocked };
  }

  #resolveVote(): VoteResolution {
    const counts = this.voteCounts();
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    if (total === 0) return this.#logVote({ outcome: 'no-votes', counts });
    const top = Math.max(...Object.values(counts));
    const leaders = Object.keys(counts).filter((id) => counts[id] === top);
    if (leaders.length > 1) return this.#logVote({ outcome: 'tie', counts });
    const winner = this.voteOptions().find((o) => o.id === leaders[0]);
    if (!winner || winner.kind === 'none' || winner.blocked.length > 0) {
      return this.#logVote({ outcome: 'none', counts });
    }
    const target = winner.upgrade ? this.#upgradeTarget(winner.kind, winner.level - 1) : this.#freeMeadow();
    if (!target || winner.level === 0) return this.#logVote({ outcome: 'none', counts });
    this.#resources.wood -= winner.cost.wood;
    this.#resources.stone -= winner.cost.stone;
    target.building = { kind: winner.kind, level: winner.level };
    target.work = 0;
    return this.#logVote({ outcome: 'built', counts, option: winner.id, x: target.x, y: target.y });
  }

  #logVote(result: VoteResolution): VoteResolution {
    this.#emit({ type: 'vote-result', result });
    return result;
  }

  /** Nearest revealed meadow without a building; unplowed first, then by row and column. */
  #freeMeadow(): Tile | undefined {
    return this.#nearest(this.#tiles.filter((t) => !t.fog && t.terrain === 'meadow' && !t.building), true);
  }

  #upgradeTarget(kind: BuildingKind, level: number): Tile | undefined {
    return this.#nearest(
      this.#tiles.filter((t) => t.building?.kind === kind && t.building.level === level),
      false,
    );
  }

  #nearest(tiles: Tile[], unplowedFirst: boolean): Tile | undefined {
    const key = (t: Tile) => [unplowedFirst && t.work > 0 ? 1 : 0, chebyshev(t, this.#landing), t.y, t.x];
    return [...tiles].sort((a, b) => {
      const ka = key(a);
      const kb = key(b);
      for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i]! - kb[i]!;
      return 0;
    })[0];
  }

  // ---------------------------------------------------------------- month end

  #endOfMonth(vote: VoteResolution): MonthReport {
    const P = this.params;
    const n = this.#n();

    const need = this.foodNeed();
    const before = this.#resources.food;
    let eaten: number;
    let hungry: number;
    if (before >= need) {
      eaten = need;
      hungry = 0;
    } else {
      eaten = before;
      hungry = Math.ceil((need - before) / P.foodPerVillager);
    }
    let food = before - eaten;
    const spoiled = Math.max(0, food - this.foodStorage());
    food -= spoiled;
    this.#resources.food = food;

    const capacity = this.shelterCapacity();
    const unsheltered = Math.max(0, n - capacity);

    const moodFood = hungry === 0 ? P.moodFed : -Math.ceil((P.moodHungerPenalty * hungry) / n);
    const moodShelter =
      unsheltered === 0
        ? P.moodSheltered + (capacity >= P.spareShelterRatio * n ? P.moodSpareShelter : 0)
        : -Math.ceil((P.moodShelterPenalty * unsheltered) / n);
    const recreation = this.#recreation;
    const moodRecreation = Math.floor((P.moodRecreation * recreation) / n);
    const total = moodFood + moodShelter + moodRecreation;
    this.#happiness += total;

    for (const t of this.#tiles) {
      if (t.terrain === 'forest') t.stock = Math.min(P.forestCapacity, Math.ceil(t.stock * P.forestRegrowth));
      if (t.terrain === 'field') t.stock = P.fieldCapacity;
      t.uses = 0;
    }
    this.#recreation = 0;

    return {
      month: this.#month,
      villagers: this.#villagers,
      vote,
      food: { before, need, eaten, hungry, spoiled, after: food },
      shelter: { capacity, unsheltered },
      recreation,
      mood: { food: moodFood, shelter: moodShelter, recreation: moodRecreation, total },
      happiness: this.#happiness,
      unusedActions: this.#unused,
    };
  }

  #end(early: boolean): void {
    this.#phase = 'ended';
    this.#emit({ type: 'game-ended', early, happiness: this.#happiness, grade: this.grade() });
  }

  // ---------------------------------------------------------------- helpers

  #buildTiles(map: TerrainMap): void {
    this.#width = map.width;
    this.#height = map.height;
    this.#landing = { ...map.landing };
    this.#tiles = map.terrain.map((terrain, i) => {
      const x = i % map.width;
      const y = Math.floor(i / map.width);
      return {
        x,
        y,
        terrain,
        fog: chebyshev({ x, y }, map.landing) > 1,
        exploreWork: 0,
        work: 0,
        stock: terrain === 'forest' ? this.params.forestCapacity : 0,
        uses: 0,
        building: null,
      };
    });
    for (const t of this.#tiles) {
      if (!t.fog && t.terrain !== 'sea') this.#revealSeaAround(t, null);
    }
  }

  #tileAt(c: Coord): Tile | undefined {
    if (!inBounds(this.#width, this.#height, c)) return undefined;
    return this.#tiles[indexOf(this.#width, c)];
  }

  #around(tile: Tile): Tile[] {
    return neighbors8(this.#width, this.#height, tile).map((c) => this.#tiles[indexOf(this.#width, c)]!);
  }

  #countVillagers(): number {
    let n = 0;
    for (const p of this.#players.values()) if (!p.removed && p.countsFromMonth <= this.#month) n += 1;
    return n;
  }

  /** N for formulas; never zero. */
  #n(): number {
    return Math.max(1, this.#villagers);
  }

  #roundPrice(value: number): number {
    const step = this.params.costRounding;
    // Math.max turns the -0 from ceil(-EPSILON) into 0.
    return step > 0 ? Math.max(0, Math.ceil(value / step - EPSILON)) * step : Math.ceil(value);
  }

  #present(): Player[] {
    return [...this.#players.values()].filter((p) => p.connected && !p.removed);
  }

  #expectPhase(phase: Phase): void {
    if (this.#phase !== phase) throw new Error(`expected phase ${phase}, game is in ${this.#phase}`);
  }

  #setPhase(to: Phase): void {
    this.#phase = to;
    this.#emit({ type: 'phase', to });
  }

  #emit(event: LogEvent): LogEntry {
    const entry = { ...event, seq: this.#log.length + 1, t: this.#clock(), month: this.#month, phase: this.#phase } as LogEntry;
    this.#log.push(entry);
    return entry;
  }
}
