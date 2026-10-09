/**
 * Numbers the views show that the protocol does not carry (exploration work needed,
 * plowing work, full stock, uses per month, skill progress needed, shelter places).
 * They come from the same rule parameters the server uses. If the server ever runs
 * tuned parameters, these must arrive in the protocol instead.
 */
import { chebyshev, DEFAULT_PARAMS, type BuildingKind, type Coord, type GameParams, type Level, type PublicTile, type Terrain } from '@saari/rules';

export const PARAMS: GameParams = DEFAULT_PARAMS;

/** N for formulas; never zero (same as the engine). */
export function villagersForFormulas(villagers: number): number {
  return Math.max(1, villagers);
}

export function exploreNeeded(tile: Coord, landing: Coord, params: GameParams = PARAMS): number {
  return params.exploreBase + Math.floor(chebyshev(tile, landing) / params.exploreDistanceDivisor);
}

/** Work to turn this terrain into something else (meadow → field, rock → quarry). */
export function workNeeded(terrain: Terrain, params: GameParams = PARAMS): number | null {
  if (terrain === 'meadow') return params.plowWork;
  if (terrain === 'rock') return params.quarryWork;
  return null;
}

/** Full stock of a terrain that has one. */
export function stockMax(terrain: Terrain, params: GameParams = PARAMS): number | null {
  switch (terrain) {
    case 'forest':
      return params.forestCapacity;
    case 'field':
      return params.fieldCapacity;
    case 'quarry':
      return params.quarryCapacity;
    default:
      return null;
  }
}

export function recreationCapacity(divisor: number, villagers: number): number {
  return Math.max(1, Math.round(villagersForFormulas(villagers) / divisor));
}

/** Uses per month of a spring or gathering place on this tile; null when it has none. */
export function tileUseCapacity(tile: PublicTile, villagers: number, params: GameParams = PARAMS): number | null {
  if (tile.fog) return null;
  if (tile.building?.kind === 'gathering') {
    return recreationCapacity(params.gatheringDivisors[tile.building.level - 1]!, villagers);
  }
  if (!tile.building && tile.terrain === 'spring') return recreationCapacity(params.springDivisor, villagers);
  return null;
}

/** People one shelter of this level covers (rounded up, as the design doc counts places). */
export function shelterPeople(level: Level, villagers: number, params: GameParams = PARAMS): number {
  return Math.ceil(villagersForFormulas(villagers) / params.shelterDivisors[level - 1]!);
}

export function gatheringUses(level: Level, villagers: number, params: GameParams = PARAMS): number {
  return recreationCapacity(params.gatheringDivisors[level - 1]!, villagers);
}

export function skillNeeded(level: number, params: GameParams = PARAMS): number {
  return params.skillProgressPerLevel * level;
}

export function maxSkillLevel(params: GameParams = PARAMS): number {
  return params.maxSkillLevel;
}

export function toolsMultiplier(level: number, params: GameParams = PARAMS): number {
  return 1 + params.toolsBonusPerLevel * (level - 1);
}

export function actionsPerMonth(education: number, params: GameParams = PARAMS): number {
  return params.baseActions + (education - 1);
}

/** Progress per study / tool-making action = the building's level. */
export function skillGainPerAction(level: Level): number {
  return level;
}

export function isBuildingKind(value: string): value is BuildingKind {
  return value === 'shelter' || value === 'school' || value === 'workshop' || value === 'gathering';
}

/** 'shelter-2' → { kind: 'shelter', level: 2 }; null for 'none' or anything unknown. */
export function parseOptionId(id: string): { kind: BuildingKind; level: Level } | null {
  const match = /^([a-z]+)-([123])$/.exec(id);
  if (!match || !isBuildingKind(match[1]!)) return null;
  return { kind: match[1], level: Number(match[2]) as Level };
}
