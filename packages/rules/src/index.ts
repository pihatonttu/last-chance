import { Game, type GameOptions } from './game.ts';
import { generateTerrain } from './mapgen.ts';

export * from './game.ts';
export * from './grid.ts';
export * from './params.ts';
export * from './rng.ts';
export * from './types.ts';
export { describeTerrain, generateTerrain } from './mapgen.ts';

/** A game whose island is generated from the seed when it starts. */
export function createGame(options: Omit<GameOptions, 'generate' | 'terrain'>): Game {
  return new Game({ ...options, generate: generateTerrain });
}
