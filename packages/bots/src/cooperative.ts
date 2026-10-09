import { chebyshev, type Coord, type Game, type Rng, type VoteOption } from '@saari/rules';
import { availableMoves, hasActionsLeft, movesOfKind, openOptions, toCoord, type Move } from './bot.ts';

/** Skills are worth studying only with at least this many months left after this one. */
const SKILL_HORIZON = 4;

/**
 * The order a well-organised class builds in: everyone under a roof first, then school,
 * gathering place and workshop, then upgrades. In simulation (2026-10-09) this beat
 * putting the school or the gathering place before the shelters. Tokens:
 * - 'shelter:first' a shelter while there is none,
 * - 'shelter' the cheapest shelter step while not everyone has shelter,
 * - 'shelter:spare' the same until there is spare room,
 * - any option id such as 'school-1'.
 */
export const DEFAULT_BUILD_ORDER: readonly string[] = [
  'shelter:first',
  'shelter',
  'school-1',
  'gathering-1',
  'workshop-1',
  'shelter:spare',
  'gathering-2',
  'school-2',
  'workshop-2',
  'gathering-3',
  'school-3',
  'workshop-3',
];

export interface CoopOptions {
  noise: number;
  buildOrder: readonly string[];
}

function wanted(token: string, c: Context): string | null {
  switch (token) {
    case 'shelter:first':
      return c.shelters === 0 ? 'shelter' : null;
    case 'shelter':
      return c.share < 1 ? 'shelter' : null;
    case 'shelter:spare':
      return c.share < c.game.params.spareShelterRatio ? 'shelter' : null;
    default:
      return token;
  }
}

interface Context {
  game: Game;
  shelters: number;
  /** Share of the village with shelter (1 = everyone). */
  share: number;
}

function context(game: Game): Context {
  return {
    game,
    shelters: game.tiles().filter((t) => t.building?.kind === 'shelter').length,
    share: game.shelterShare(),
  };
}

/** Stone is scarcer than wood, so it weighs double when comparing prices. */
const price = (o: VoteOption) => o.cost.wood + 2 * o.cost.stone;

/**
 * 'shelter' resolves to the cheapest shelter option that can be built now (every
 * shelter step adds the same share), or the cheapest one to save up for.
 */
function resolveWant(match: string, options: readonly VoteOption[]): VoteOption | undefined {
  if (match !== 'shelter') return options.find((o) => o.id === match);
  const shelters = options
    .filter((o) => o.kind === 'shelter' && !o.blocked.includes('space'))
    .sort((a, b) => price(a) - price(b));
  return shelters.find((o) => o.blocked.length === 0) ?? shelters[0];
}

/** The buildings the class wants, best first, as currently offered options. */
export function wantedOptions(game: Game, order: readonly string[] = DEFAULT_BUILD_ORDER): VoteOption[] {
  const ctx = context(game);
  const options = game.voteOptions();
  const result: VoteOption[] = [];
  for (const token of order) {
    const match = wanted(token, ctx);
    if (match === null) continue;
    const option = resolveWant(match, options);
    if (option && !result.includes(option)) result.push(option);
  }
  return result;
}

/** What the class is saving up for this month. */
export function plannedBuilding(game: Game, order: readonly string[] = DEFAULT_BUILD_ORDER): VoteOption | undefined {
  return wantedOptions(game, order)[0];
}

export function cooperativeVote(game: Game, _playerId: string, rng: Rng, options: CoopOptions): string {
  const open = openOptions(game);
  if (options.noise > 0 && rng.next() < options.noise) return rng.pick(open).id;
  return wantedOptions(game, options.buildOrder).find((o) => o.blocked.length === 0)?.id ?? 'none';
}

export function cooperativeAction(game: Game, playerId: string, rng: Rng, options: CoopOptions): Coord | null {
  if (!hasActionsLeft(game, playerId)) return null;
  const moves = availableMoves(game, playerId);
  if (moves.length === 0) return null;
  if (options.noise > 0 && rng.next() < options.noise) return toCoord(rng.pick(moves));
  return toCoord(choose(game, moves, options.buildOrder) ?? moves[0]);
}

function choose(game: Game, moves: Move[], order: readonly string[]): Move | undefined {
  const landing = game.landing;
  const dist = (m: Move) => chebyshev(m, landing);
  const resource = (m: Move) => (m.preview.yield.type === 'resource' ? m.preview.yield.amount : 0);
  /** Highest yield first, nearest the landing on ties. */
  const richest = (list: Move[]) => best(list, (m) => resource(m) - dist(m) / 1000);
  /** Least work left first, nearest the landing on ties. */
  const quickest = (list: Move[]) =>
    best(list, (m) => {
      const y = m.preview.yield;
      return (y.type === 'work' ? y.done - y.needed : 0) - dist(m) / 1000;
    });

  const food = game.resources.food;
  const need = game.foodNeed();
  const monthsLeft = game.totalMonths - game.month;
  const wanted = wantedOptions(game, order);
  const target = wanted[0];
  const next = wanted[1];
  const reserved = target && !target.upgrade ? reservedMeadow(game) : undefined;

  // 1. Nobody goes hungry this month.
  if (food < need) {
    const m = richest(movesOfKind(moves, 'harvest')) ?? richest(movesOfKind(moves, 'fish'));
    if (m) return m;
  }

  // 2. Enough fields to feed the village.
  const fields = game.tiles().filter((t) => t.terrain === 'field').length;
  if (fields * game.params.fieldCapacity < need && monthsLeft >= 2) {
    const plow = movesOfKind(moves, 'plow').filter((m) => !reserved || m.x !== reserved.x || m.y !== reserved.y);
    const m = quickest(plow);
    if (m) return m;
  }

  // 3. Materials and room for the planned building.
  if (target) {
    if (target.cost.wood > game.resources.wood) {
      // No forest in sight: go and find one.
      const m = richest(movesOfKind(moves, 'chop')) ?? quickest(movesOfKind(moves, 'explore'));
      if (m) return m;
    }
    if (target.cost.stone > game.resources.stone) {
      const m =
        richest(movesOfKind(moves, 'mine')) ??
        quickest(movesOfKind(moves, 'build-quarry')) ??
        quickest(movesOfKind(moves, 'explore'));
      if (m) return m;
    }
    if (!target.upgrade && target.blocked.includes('space')) {
      const clear = best(movesOfKind(moves, 'chop'), (m) => -resource(m));
      const m = quickest(movesOfKind(moves, 'explore')) ?? clear;
      if (m) return m;
    }
  }

  // 4. Invest in skills while there is time for them to pay back.
  if (monthsLeft >= SKILL_HORIZON) {
    const m = movesOfKind(moves, 'study')[0] ?? movesOfKind(moves, 'make-tools')[0];
    if (m) return m;
  }

  // 5. Recreation.
  const fun = movesOfKind(moves, 'swim', 'gather')[0];
  if (fun) return fun;

  // 6. Save up for next month's building too.
  if (target && next) {
    if (target.cost.wood + next.cost.wood > game.resources.wood) {
      const m = richest(movesOfKind(moves, 'chop'));
      if (m) return m;
    }
    if (target.cost.stone + next.cost.stone > game.resources.stone) {
      const m = richest(movesOfKind(moves, 'mine')) ?? quickest(movesOfKind(moves, 'build-quarry'));
      if (m) return m;
    }
  }

  // 7. Exploring, 8. stocking up.
  return (
    quickest(movesOfKind(moves, 'explore')) ??
    (food < game.foodStorage() ? richest(movesOfKind(moves, 'harvest', 'fish')) : undefined) ??
    richest(movesOfKind(moves, 'chop', 'mine'))
  );
}

function best(moves: Move[], score: (m: Move) => number): Move | undefined {
  let top: Move | undefined;
  let topScore = -Infinity;
  for (const m of moves) {
    const s = score(m);
    if (s > topScore) {
      top = m;
      topScore = s;
    }
  }
  return top;
}

/** The meadow the next new building will take (same order as the engine's placement). */
function reservedMeadow(game: Game): Coord | undefined {
  const landing = game.landing;
  const free = game.tiles().filter((t) => !t.fog && t.terrain === 'meadow' && !t.building);
  free.sort(
    (a, b) =>
      (a.work > 0 ? 1 : 0) - (b.work > 0 ? 1 : 0) ||
      chebyshev(a, landing) - chebyshev(b, landing) ||
      a.y - b.y ||
      a.x - b.x,
  );
  return free[0];
}
