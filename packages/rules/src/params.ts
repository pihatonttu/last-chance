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
 * Frost (docs/10-arktinen.md §4): every month has a temperature from `mildest` down to
 * `coldest` in `step` degrees, drawn from the game seed.
 */
export interface WeatherParams {
  mildest: number;
  coldest: number;
  step: number;
  /** Month 1 is no colder than this, so the village has time to start. */
  firstMonthColdest: number;
  /** At or below this the fire needs the "cold" amount of wood. */
  coldAt: number;
  /** At or below this it is a hard frost. */
  hardAt: number;
  /** Hard-frost months every game has (when it lasts 3 months or more). */
  minHardMonths: number;
}

/**
 * Every tunable number of the rules. The defaults are the simulator-tuned values
 * (docs/05-tasapaino.md); the design doc's starting values live on in the rule tests.
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
  /** Wood for the fire at the start; rounded up like prices. */
  startWoodPerVillager: number;
  /** Ice at the start, enough for the first igloo; rounded up like prices. */
  startStonePerVillager: number;

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

  /** Spring uses per month = max(1, round(N / springDivisor)). */
  springDivisor: number;
  /** Gathering place uses per month by level = max(1, round(N / divisor)). */
  gatheringDivisors: readonly [number, number, number];
  /** A shelter of level k covers 1 / shelterDivisors[k-1] of the village. */
  shelterDivisors: readonly [number, number, number];

  moodFed: number;
  moodHungerPenalty: number;
  moodSheltered: number;
  moodSpareShelter: number;
  spareShelterRatio: number;
  moodShelterPenalty: number;
  moodRecreation: number;

  weather: WeatherParams;
  /**
   * Wood the village fire burns per villager at month end: mild (t > coldAt), cold
   * (hardAt < t <= coldAt) and hard frost (t <= hardAt).
   */
  heatWoodPerVillager: readonly [number, number, number];
  moodWarm: number;
  moodColdPenalty: number;

  costs: Record<BuildingKind, readonly [Cost, Cost, Cost]>;
  costRounding: number;

  /**
   * Happiness needed for grades 2..6, per game length. Short games get their own
   * thresholds: the shelter-building months weigh more in 10 months than in 15.
   */
  gradeThresholds: Record<GameLength, readonly [number, number, number, number, number]>;

  /** The village gives up when the happiness falls below this after a month end (docs/10 §4b). */
  lossThreshold: Record<GameLength, number>;
  /** The class is warned when the happiness is less than this above the loss limit. */
  lossWarningMargin: number;

  map: MapGenParams;
}

export const DEFAULT_PARAMS: GameParams = {
  months: { normal: 15, short: 10 },
  baseActions: 3,
  joinClosesAtMonth: 4,

  foodPerVillager: 6,
  foodStorageMonths: 2,
  startFoodPerVillager: 6,
  startWoodPerVillager: 3,
  startStonePerVillager: 9,

  harvestYield: 10,
  fishYield: 4,
  chopYield: 10,
  mineYield: 12,
  mineMinYield: 2,

  fieldCapacity: 30,
  plowWork: 3,
  forestCapacity: 40,
  forestRegrowth: 1.25,
  quarryCapacity: 120,
  quarryWork: 2,

  exploreBase: 1,
  exploreDistanceDivisor: 2,

  maxSkillLevel: 3,
  skillProgressPerLevel: 4,
  toolsBonusPerLevel: 0.25,

  springDivisor: 4,
  gatheringDivisors: [3, 2, 1],
  shelterDivisors: [6, 3, 2],

  moodFed: 2,
  moodHungerPenalty: 10,
  moodSheltered: 2,
  moodSpareShelter: 1,
  spareShelterRatio: 1.25,
  moodShelterPenalty: 10,
  moodRecreation: 10,

  weather: { mildest: -10, coldest: -35, step: 5, firstMonthColdest: -15, coldAt: -20, hardAt: -30, minHardMonths: 2 },
  heatWoodPerVillager: [2, 4, 10],
  moodWarm: 2,
  moodColdPenalty: 6,

  costs: {
    shelter: [
      { wood: 0, stone: 4 },
      { wood: 0, stone: 6 },
      { wood: 3, stone: 6 },
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

  gradeThresholds: {
    normal: [-51, -30, 20, 55, 90],
    short: [-44, -25, 0, 18, 40],
  },
  lossThreshold: { normal: -52, short: -45 },
  lossWarningMargin: 20,

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
