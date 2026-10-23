import type { GameParams } from '../src/params.ts';

/**
 * Frozen copy of the design-doc starting values (docs/04-pelisuunnittelu.md §16; frost, the
 * fire, igloo prices and the loss limit from docs/10-arktinen.md §4, §4b and §5).
 * Rule tests use these so that balance tuning of DEFAULT_PARAMS never changes what
 * the formula tests expect. Change only when a rule itself changes.
 */
export const RULE_TEST_PARAMS: GameParams = {
  months: { normal: 15, short: 10 },
  baseActions: 3,
  joinClosesAtMonth: 4,

  foodPerVillager: 4,
  foodStorageMonths: 2,
  startFoodPerVillager: 4,
  startWoodPerVillager: 2,
  startStonePerVillager: 4,

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

  weather: { mildest: -10, coldest: -35, step: 5, firstMonthColdest: -15, coldAt: -20, hardAt: -30, minHardMonths: 2 },
  heatWoodPerVillager: [1, 2, 3],
  moodWarm: 2,
  moodColdPenalty: 10,

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

  gradeThresholds: { normal: [-60, 0, 40, 80, 110], short: [-40, 0, 27, 53, 73] },
  lossThreshold: { normal: -60, short: -60 },
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
