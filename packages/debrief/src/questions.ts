import { totalOf } from './actions.ts';
import type { DebriefCrisis, DebriefQuestion, GroupCounts, QuestionId } from './types.ts';

/** What the question triggers look at; buildDebrief fills it from the game. */
export interface QuestionFacts {
  /** Months the game was planned to last. */
  totalMonths: number;
  monthsPlayed: number;
  grade: number;
  crises: readonly DebriefCrisis[];
  /** Months (not necessarily in a row) with someone unsheltered. */
  unshelteredMonths: number;
  ties: number;
  emptyMonths: number;
  votesCast: number;
  votesPossible: number;
  /** Actions used, per group, over the whole game. */
  actions: GroupCounts;
  unused: number;
  springFoundMonth: number | null;
}

/** Every question id in priority order; 'decision-making' is always asked, last. */
export const QUESTION_IDS = [
  'hunger',
  'no-shelter-long',
  'ties',
  'empty-months',
  'skills-heavy',
  'skills-none',
  'spring-never',
  'spring-late',
  'unused-actions',
  'low-participation',
  'good-result',
  'decision-making',
] as const satisfies readonly QuestionId[];

// Compile-time check that QUESTION_IDS lists every QuestionId.
const _allListed: [Exclude<QuestionId, (typeof QUESTION_IDS)[number]>] extends [never] ? true : false = true;
void _allListed;

/**
 * Trigger thresholds. Checked against bot games (2026-10-09, @saari/bots, 5 and 20
 * villagers, normal and short): cooperative classes trigger almost nothing, random,
 * lazy and selfish classes each trigger the questions about their weak spot.
 */
export const THRESHOLDS = {
  /** Most triggered questions; 'decision-making' comes on top (design doc: 3-5 questions). */
  maxTriggered: 4,
  /**
   * 'no-shelter-long': months with someone unsheltered. A cooperative class takes about
   * five months to shelter everyone, in short games too, so six means the build-up dragged.
   * Kept absolute: the build-up does not get shorter in a short game.
   */
  noShelterMonths: 6,
  /** 'ties': ties over the game. One tie happens; two is a pattern. */
  ties: 2,
  /** 'empty-months': months that built nothing, not counting ties the 'ties' question covers. */
  emptyMonths: 3,
  /** 'skills-heavy': percent of the actions used on school and workshop (cooperative bots ~20 %). */
  skillsHeavyPercent: 30,
  /** 'unused-actions': percent of all actions left unused (a few absent players stay below). */
  unusedPercent: 15,
  /** 'low-participation': asked below this percent of possible votes. */
  lowParticipationPercent: 70,
  /** 'good-result': grade 5 (Kukoistava kylä) or 6 (Saaren paratiisi). */
  goodGrade: 5,
  /** 'spring-late': found after this share of the planned months, i.e. in the last third. */
  springLateAfter: 2 / 3,
  /**
   * 'skills-none' and 'spring-never' ask about something that never happened, which says
   * nothing in a game ended after a month or two: they need this share of the planned months played.
   */
  absenceMinPlayed: 1 / 3,
} as const;

/** Whole percent 0-100; triggers compare this rounded value, so the number shown always agrees. */
function percent(part: number, whole: number): number {
  return whole > 0 ? Math.round((100 * part) / whole) : 0;
}

/** Params of every question whose trigger fires; absent = not triggered. */
function triggered(f: QuestionFacts): Partial<Record<QuestionId, Record<string, number>>> {
  const T = THRESHOLDS;
  const out: Partial<Record<QuestionId, Record<string, number>>> = {};
  const used = totalOf(f.actions);

  const hunger = f.crises.filter((c) => c.kind === 'hunger');
  if (hunger.length > 0) {
    out.hunger = { month: hunger[0]!.month, people: Math.max(...hunger.map((c) => c.people)) };
  }

  if (f.unshelteredMonths >= T.noShelterMonths) out['no-shelter-long'] = { months: f.unshelteredMonths };

  const tiesAsked = f.ties >= T.ties;
  if (tiesAsked) out.ties = { count: f.ties };
  // Empty months the ties question already covers do not count towards this one.
  if (f.emptyMonths - (tiesAsked ? f.ties : 0) >= T.emptyMonths) out['empty-months'] = { count: f.emptyMonths };

  const skills = percent(f.actions.skills, used);
  if (used > 0 && skills >= T.skillsHeavyPercent) out['skills-heavy'] = { percent: skills };

  const longEnough = f.monthsPlayed > 0 && f.monthsPlayed >= Math.ceil(f.totalMonths * T.absenceMinPlayed);
  if (longEnough && f.actions.skills === 0) out['skills-none'] = {};
  if (longEnough && f.springFoundMonth === null) out['spring-never'] = {};
  if (f.springFoundMonth !== null && f.springFoundMonth > f.totalMonths * T.springLateAfter) {
    out['spring-late'] = { month: f.springFoundMonth };
  }

  const unused = percent(f.unused, used + f.unused);
  if (unused >= T.unusedPercent) out['unused-actions'] = { percent: unused };

  const voted = percent(f.votesCast, f.votesPossible);
  if (f.votesPossible > 0 && voted < T.lowParticipationPercent) out['low-participation'] = { percent: voted };

  if (f.grade >= T.goodGrade) out['good-result'] = { grade: f.grade };
  return out;
}

/**
 * Discussion questions (design doc §13.2 item 6): the triggered ones in QUESTION_IDS
 * priority order, at most THRESHOLDS.maxTriggered, then always 'decision-making'.
 */
export function pickQuestions(f: QuestionFacts): DebriefQuestion[] {
  const fired = triggered(f);
  const picked: DebriefQuestion[] = [];
  for (const id of QUESTION_IDS) {
    const params = fired[id];
    if (params && picked.length < THRESHOLDS.maxTriggered) picked.push({ id, params });
  }
  picked.push({ id: 'decision-making', params: {} });
  return picked;
}
