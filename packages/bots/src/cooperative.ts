import { chebyshev, woodPerVillager, type Coord, type Game, type Rng, type VoteOption } from '@saari/rules';
import { availableMoves, hasActionsLeft, movesOfKind, openOptions, toCoord, type Move } from './bot.ts';

/** Skills are worth studying only with at least this many months left after this one. */
const SKILL_HORIZON = 4;
/** Shelter shares are sums of 1/6, 1/3, 1/2 and suffer float error (6 x 1/6 < 1). */
const EPSILON = 1e-9;

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

/**
 * Wood the class wants in store for the village fire (docs/10-arktinen.md §8): this month's
 * need and, by the forecast, next month's, so a hard frost never comes as a surprise. In the
 * last month only this month's.
 */
export function woodTarget(game: Game): number {
  const forecast = game.forecast();
  const next = forecast === null ? 0 : woodPerVillager(forecast, game.params) * Math.max(1, game.villagers);
  return game.heatNeed() + next;
}

/**
 * Wood that is free for buildings: what is left over the fire of this month and next. The
 * vote itself only must not leave this month's fire cold; saving for next month as well keeps
 * a village from spending next month's fire on a building and then finding no forest left.
 */
function spareWood(game: Game): number {
  return game.resources.wood - woodTarget(game);
}

export interface CoopOptions {
  noise: number;
  buildOrder: readonly string[];
}

function wanted(token: string, c: Context): string | null {
  switch (token) {
    case 'shelter:first':
      return c.shelters === 0 ? 'shelter' : null;
    case 'shelter':
      return c.share + EPSILON < 1 ? 'shelter' : null;
    case 'shelter:spare':
      return c.share + EPSILON < c.game.params.spareShelterRatio ? 'shelter' : null;
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

/** Ice (`stone`) is scarcer than wood, so it weighs double when comparing prices. */
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

/**
 * The first wanted building that can be built now. An option that would leave this month's
 * fire cold is never chosen while another open option exists ('none' always is), not even
 * by the random slips of the noise.
 */
export function cooperativeVote(game: Game, _playerId: string, rng: Rng, options: CoopOptions): string {
  const open = openOptions(game);
  const warm = open.filter((o) => !o.leavesFireCold);
  const choices = warm.length > 0 ? warm : open;
  if (options.noise > 0 && rng.next() < options.noise) return rng.pick(choices).id;
  const allowed = new Set(choices.map((o) => o.id));
  return wantedOptions(game, options.buildOrder).find((o) => allowed.has(o.id))?.id ?? 'none';
}

export function cooperativeAction(game: Game, playerId: string, rng: Rng, options: CoopOptions): Coord | null {
  if (!hasActionsLeft(game, playerId)) return null;
  const moves = availableMoves(game, playerId);
  if (moves.length === 0) return null;
  if (options.noise > 0 && rng.next() < options.noise) return toCoord(rng.pick(moves));
  return toCoord(choose(game, moves, options.buildOrder));
}

function choose(game: Game, moves: Move[], order: readonly string[]): Move | undefined {
  const landing = game.landing;
  const dist = (m: Move) => chebyshev(m, landing);
  const resource = (m: Move) => (m.preview.yield.type === 'resource' ? m.preview.yield.amount : 0);
  const stock = (m: Move) => game.tile(m.x, m.y)?.stock ?? 0;
  /**
   * Highest yield first, nearest the landing on ties. Among chops the fullest forest first:
   * a forest near full grows back the most (25 % a month up to the cap), so the logging
   * spreads over the forests instead of thinning the nearest ones until only clearing is left.
   */
  const richest = (list: Move[]) =>
    best(list, (m) => resource(m) + (m.preview.kind === 'chop' ? stock(m) / 100 : 0) - dist(m) / 10000);
  /** Chops that leave trees standing, so the forest grows back: wood for the fire. */
  const sustainable = (list: Move[]) => list.filter((m) => m.preview.kind !== 'chop' || resource(m) < stock(m));
  /**
   * Chops that leave at least half the trees: wood for buildings. A thinned forest barely
   * grows back, so the rest is kept for the fire, which needs wood every month.
   */
  const thriving = (list: Move[]) =>
    list.filter((m) => m.preview.kind !== 'chop' || stock(m) - resource(m) >= game.params.forestCapacity / 2);
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

  // 1b. The fire burns this month and, by the forecast, next month too. Never clear a forest
  // while another can be found; when nothing else is left, the fire comes first.
  if (game.resources.wood < woodTarget(game)) {
    const chops = movesOfKind(moves, 'chop');
    const m = richest(sustainable(chops)) ?? quickest(movesOfKind(moves, 'explore')) ?? richest(chops);
    if (m) return m;
  }

  // 2. Enough fields to feed the village.
  const fields = game.tiles().filter((t) => t.terrain === 'field').length;
  if (fields * game.params.fieldCapacity < need && monthsLeft >= 2) {
    const plow = movesOfKind(moves, 'plow').filter((m) => !reserved || m.x !== reserved.x || m.y !== reserved.y);
    const m = quickest(plow);
    if (m) return m;
  }

  // 3. Materials and room for the planned building. Its wood comes on top of the fire's
  // and only from forests that keep half their trees.
  if (target) {
    if (target.cost.wood > 0 && target.cost.wood > spareWood(game)) {
      // No such forest in sight: go and find one.
      const m = richest(thriving(movesOfKind(moves, 'chop'))) ?? quickest(movesOfKind(moves, 'explore'));
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

  // 6. Save up for next month's building too, on top of the fire's wood.
  if (target && next) {
    const wood = target.cost.wood + next.cost.wood;
    if (wood > 0 && wood > spareWood(game)) {
      const m = richest(thriving(movesOfKind(moves, 'chop')));
      if (m) return m;
    }
    if (target.cost.stone + next.cost.stone > game.resources.stone) {
      const m = richest(movesOfKind(moves, 'mine')) ?? quickest(movesOfKind(moves, 'build-quarry'));
      if (m) return m;
    }
  }

  // 7. Exploring, 8. food up to the storage limit, 9. wood from forests that keep half their trees.
  // Nothing sensible left: leave the action unused rather than waste the island.
  return (
    quickest(movesOfKind(moves, 'explore')) ??
    (food < game.foodStorage() ? richest(movesOfKind(moves, 'harvest', 'fish')) : undefined) ??
    richest(thriving(movesOfKind(moves, 'chop')))
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

/**
 * The meadow the next new building will take (same order as the engine's placement, which
 * never builds on the landing: it is the village fire).
 */
function reservedMeadow(game: Game): Coord | undefined {
  const landing = game.landing;
  const isLanding = (t: Coord) => t.x === landing.x && t.y === landing.y;
  const free = game.tiles().filter((t) => !t.fog && t.terrain === 'meadow' && !t.building && !isLanding(t));
  free.sort(
    (a, b) =>
      (a.work > 0 ? 1 : 0) - (b.work > 0 ? 1 : 0) ||
      chebyshev(a, landing) - chebyshev(b, landing) ||
      a.y - b.y ||
      a.x - b.x,
  );
  return free[0];
}
