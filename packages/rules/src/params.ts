import type { MapGenParams } from './types.ts';

export type BuildingKind = 'shelter' | 'school' | 'workshop' | 'gathering';
export type Level = 1 | 2 | 3;
export type GameLength = 'normal' | 'short';

/** Cost per villager; the game multiplies by N and rounds up to `costRounding`. */
export interface Cost {
  wood: number;
  stone: number;
}

/**
 * Every tunable number of the rules. Starting values come from
 * docs/04-pelisuunnittelu.md §16 and are tuned with the simulator (V3).
 */
export interface GameParams {
  months: Record<GameLength, number>;
  baseActions: number;
  /** Uusi pelaaja voi liittyä kuukausina 1..(joinClosesAtMonth - 1) (P33). */
  joinClosesAtMonth: number;

  foodPerVillager: number;
  /** Food storage holds this many months of need; the rest spoils (P27). */
  foodStorageMonths: number;
  startFoodPerVillager: number;
  startWoodPerVillager: number;
  startStone: number;

  harvestYield: number;
  fishYield: number;
  chopYield: number;
  /** Stone per action from a full quarry; scales with what is left. */
  mineYield: number;
  mineMinYield: number;

  fieldCapacity: number;
  plowWork: number;
  forestCapacity: number;
  /** Forest stock is multiplied by this each month and rounded up. */
  forestRegrowth: number;
  quarryCapacity: number;
  quarryWork: number;

  /** Exploring needs exploreBase + floor(distance / exploreDistanceDivisor) work. */
  exploreBase: number;
  exploreDistanceDivisor: number;

  maxSkillLevel: number;
  /** Progress needed for the next level = skillProgressPerLevel * current level. */
  skillProgressPerLevel: number;
  /** Each tools level above 1 adds this share to every yield and work. */
  toolsBonusPerLevel: number;

  /** Spring uses per month = ceil(N / springDivisor). */
  springDivisor: number;
  /** Gathering place uses per month by level = ceil(N / divisor). */
  gatheringDivisors: readonly [number, number, number];
  /** Shelter capacity by level = ceil(N / divisor). */
  shelterDivisors: readonly [number, number, number];

  moodFed: number;
  moodHungerPenalty: number;
  moodSheltered: number;
  moodSpareShelter: number;
  spareShelterRatio: number;
  moodShelterPenalty: number;
  moodRecreation: number;

  costs: Record<BuildingKind, readonly [Cost, Cost, Cost]>;
  costRounding: number;

  /**
   * Happiness needed for grades 2..6 in a normal game. A short game scales
   * them by months.short / months.normal. Placeholder until the simulator (V3).
   */
  gradeThresholds: readonly [number, number, number, number, number];

  map: MapGenParams;
}

export const DEFAULT_PARAMS: GameParams = {
  months: { normal: 15, short: 10 },
  baseActions: 3,
  joinClosesAtMonth: 4,

  foodPerVillager: 4,
  foodStorageMonths: 2,
  startFoodPerVillager: 4,
  startWoodPerVillager: 4,
  startStone: 0,

  harvestYield: 10,
  fishYield: 5,
  chopYield: 10,
  mineYield: 8,
  mineMinYield: 2,

  fieldCapacity: 30,
  plowWork: 3,
  forestCapacity: 40,
  forestRegrowth: 1.25,
  quarryCapacity: 60,
  quarryWork: 4,

  exploreBase: 1,
  exploreDistanceDivisor: 2,

  maxSkillLevel: 4,
  skillProgressPerLevel: 3,
  toolsBonusPerLevel: 0.25,

  springDivisor: 6,
  gatheringDivisors: [5, 4, 3],
  shelterDivisors: [6, 3, 2],

  moodFed: 2,
  moodHungerPenalty: 10,
  moodSheltered: 2,
  moodSpareShelter: 1,
  spareShelterRatio: 1.25,
  moodShelterPenalty: 10,
  moodRecreation: 10,

  costs: {
    shelter: [
      { wood: 4, stone: 0 },
      { wood: 6, stone: 0 },
      { wood: 6, stone: 3 },
    ],
    school: [
      { wood: 6, stone: 0 },
      { wood: 8, stone: 2 },
      { wood: 8, stone: 6 },
    ],
    workshop: [
      { wood: 6, stone: 0 },
      { wood: 6, stone: 4 },
      { wood: 8, stone: 8 },
    ],
    gathering: [
      { wood: 4, stone: 0 },
      { wood: 8, stone: 2 },
      { wood: 8, stone: 8 },
    ],
  },
  costRounding: 5,

  gradeThresholds: [-60, 0, 40, 80, 110],

  map: {
    landBase: 12,
    landPerVillager: 2,
    forestShare: 0.5,
    rockShare: 0.2,
    rockMinDistance: 3,
    seaRing: 2,
    screenAspect: 1.6,
  },
};
