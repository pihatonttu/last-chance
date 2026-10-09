import type { GameView, PlayerSummary, TimerView, VillageView, YouView } from '@saari/protocol';
import type { PublicTile } from '@saari/rules';

export function tile(x: number, y: number, over: Partial<PublicTile> = {}): PublicTile {
  return {
    x,
    y,
    fog: false,
    exploreWork: 0,
    terrain: 'meadow',
    building: null,
    stock: 0,
    work: 0,
    uses: 0,
    ...over,
  };
}

export function village(over: Partial<VillageView> = {}): VillageView {
  return {
    resources: { food: 40, wood: 40, stone: 0 },
    foodNeed: 40,
    foodStorage: 80,
    villagers: 10,
    shelterShare: 0,
    shelterCapacity: 0,
    happiness: 0,
    recreationThisMonth: 0,
    ...over,
  };
}

export function timer(over: Partial<TimerView> = {}): TimerView {
  return { phaseEndsAt: 100_000, remainingMs: 60_000, phaseMs: 60_000, paused: false, ...over };
}

export function gameView(over: Partial<GameView> = {}): GameView {
  const width = 3;
  const height = 2;
  const tiles: PublicTile[] = [];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) tiles.push(tile(x, y));
  return {
    code: '123456',
    length: 'normal',
    phase: 'action',
    month: 1,
    totalMonths: 15,
    timer: timer(),
    joinOpen: true,
    namesHidden: false,
    trial: false,
    village: village(),
    map: { width, height, landing: { x: 1, y: 1 }, tiles },
    vote: null,
    lastReport: null,
    players: [],
    playerCount: 10,
    result: null,
    ...over,
  };
}

export function you(over: Partial<YouView> = {}): YouView {
  return {
    id: 'p1',
    education: 1,
    educationProgress: 0,
    tools: 1,
    toolsProgress: 0,
    maxActions: 3,
    actionsLeft: 3,
    countsFromMonth: 1,
    removed: false,
    connected: true,
    nickname: 'Testi',
    color: '#0072b2',
    vote: null,
    ...over,
  };
}

export function player(id: string, over: Partial<PlayerSummary> = {}): PlayerSummary {
  return {
    id,
    nickname: id,
    color: '#0072b2',
    connected: true,
    removed: false,
    nameLocked: false,
    actionsLeft: 3,
    voted: false,
    ...over,
  };
}
