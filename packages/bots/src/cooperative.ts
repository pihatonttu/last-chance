import { chebyshev, type Coord, type Game, type Rng, type VoteOption } from '@saari/rules';
import { availableMoves, hasActionsLeft, movesOfKind, openOptions, toCoord, type Move } from './bot.ts';

/** Skills are worth studying only with at least this many months left after this one. */
const SKILL_HORIZON = 4;

/**
 * The order a well-organised class builds in. 'shelter' means the cheapest way to add
 * shelter places: a new level-1 shelter while there is room, otherwise an upgrade.
 */
const WANTS: readonly { match: string; when?: (c: Context) => boolean }[] = [
  { match: 'shelter', when: (c) => c.shelters === 0 },
  { match: 'school-1' },
  { match: 'shelter', when: (c) => c.share < 1 },
  { match: 'workshop-1' },
  { match: 'gathering-1' },
  { match: 'shelter', when: (c) => c.share < 1 },
  { match: 'shelter', when: (c) => c.share < c.game.params.spareShelterRatio },
  { match: 'gathering-2' },
  { match: 'school-2' },
  { match: 'workshop-2' },
  { match: 'gathering-3' },
  { match: 'school-3' },
  { match: 'workshop-3' },
];

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
export function wantedOptions(game: Game): VoteOption[] {
  const ctx = context(game);
  const options = game.voteOptions();
  const wanted: VoteOption[] = [];
  for (const want of WANTS) {
    if (want.when && !want.when(ctx)) continue;
    const option = resolveWant(want.match, options);
    if (option && !wanted.includes(option)) wanted.push(option);
  }
  return wanted;
}

/** What the class is saving up for this month. */
export function plannedBuilding(game: Game): VoteOption | undefined {
  return wantedOptions(game)[0];
}

export function cooperativeVote(game: Game, _playerId: string, rng: Rng, noise: number): string {
  const open = openOptions(game);
  if (noise > 0 && rng.next() < noise) return rng.pick(open).id;
  return wantedOptions(game).find((o) => o.blocked.length === 0)?.id ?? 'none';
}

export function cooperativeAction(game: Game, playerId: string, rng: Rng, noise: number): Coord | null {
  if (!hasActionsLeft(game, playerId)) return null;
  const moves = availableMoves(game, playerId);
  if (moves.length === 0) return null;
  if (noise > 0 && rng.next() < noise) return toCoord(rng.pick(moves));
  return toCoord(choose(game, moves) ?? moves[0]);
}

function choose(game: Game, moves: Move[]): Move | undefined {
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
  const target = plannedBuilding(game);
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

  // 5. Recreation, 6. exploring, 7. stocking up.
  return (
    movesOfKind(moves, 'swim', 'gather')[0] ??
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
