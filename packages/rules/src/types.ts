import type { Coord } from './grid.ts';

export type { Coord } from './grid.ts';

/** Terrains the map generator produces. */
export type NaturalTerrain = 'sea' | 'meadow' | 'forest' | 'rock' | 'spring';

/** Field and quarry only appear through play (plowing a meadow, building on rock). */
export type Terrain = NaturalTerrain | 'field' | 'quarry';

/** Output of the map generator: terrain only, no game state. Row-major. */
export interface TerrainMap {
  width: number;
  height: number;
  terrain: NaturalTerrain[];
  /** Where the class came ashore. Always a meadow on the south coast. */
  landing: Coord;
}

export interface MapGenParams {
  /** Land tiles = landBase + landPerVillager * villagers. */
  landBase: number;
  landPerVillager: number;
  /** Share of land (excluding landing and spring) that is forest. */
  forestShare: number;
  /** Share of land (excluding landing and spring) that is rock. */
  rockShare: number;
  /** Minimum Chebyshev distance from the landing for rock tiles. */
  rockMinDistance: number;
  /** Rows/columns of open sea kept on every edge of the grid. */
  seaRing: number;
  /** Target on-screen width / height of the island in isometric view. */
  screenAspect: number;
}
