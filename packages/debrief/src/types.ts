import type { GameLength, MonthReport } from '@saari/rules';

/** Groups of action kinds used everywhere in the debrief. */
export type ActionGroup = 'food' | 'fields' | 'materials' | 'explore' | 'skills' | 'recreation';

export type GroupCounts = Record<ActionGroup, number>;

export interface DebriefPlayer {
  id: string;
  /** Nickname in the named version, "Pelaaja 7" style in the stored one (P23). */
  label: string;
  color: string;
  actions: GroupCounts;
  unusedActions: number;
  education: number;
  tools: number;
  /** One entry per month played; option null = did not vote. */
  votes: { month: number; option: string | null }[];
}

export interface DebriefCrisis {
  kind: 'hunger' | 'no-shelter';
  /** First month of the crisis. */
  month: number;
  /** Most people affected in one month of it. */
  people: number;
  /** First month after it with nobody affected; null if it lasted to the end. */
  resolvedMonth: number | null;
}

/**
 * Discussion question ids (design doc §13.2). The debrief picks 3-5 by trigger; the
 * client renders each from a translation template with {param} placeholders, so the
 * debrief itself stays language-neutral (P17). Params per id:
 * - 'hunger': month (first hungry month), people (most hungry in one month)
 * - 'no-shelter-long': months (months with someone unsheltered)
 * - 'ties': count
 * - 'empty-months': count (months that built nothing)
 * - 'skills-heavy': percent (share of actions on school + workshop, 0-100)
 * - 'skills-none': (no params) nobody studied or made tools
 * - 'spring-late': month
 * - 'spring-never': (no params)
 * - 'unused-actions': percent (share of actions left unused)
 * - 'low-participation': percent (share of possible votes cast)
 * - 'good-result': grade (grade 5 or 6)
 * - 'next-time', 'roles': (no params) general questions that fill a quiet game up to three
 * - 'decision-making': (no params) always included last
 */
export type QuestionId =
  | 'hunger'
  | 'no-shelter-long'
  | 'ties'
  | 'empty-months'
  | 'skills-heavy'
  | 'skills-none'
  | 'spring-late'
  | 'spring-never'
  | 'unused-actions'
  | 'low-participation'
  | 'good-result'
  | 'next-time'
  | 'roles'
  | 'decision-making';

export interface DebriefQuestion {
  id: QuestionId;
  params: Record<string, number>;
}

export interface DebriefData {
  version: 1;
  /** ISO timestamp of the game end. */
  createdAt: string;
  /** true: labels are nicknames (teacher's device only). false: pseudonymised (stored). */
  named: boolean;
  length: GameLength;
  totalMonths: number;
  monthsPlayed: number;
  endedEarly: boolean;
  happiness: number;
  grade: number;
  /** Villagers in the last month played. */
  villagers: number;
  /** The month reports as the engine produced them. */
  months: MonthReport[];
  /** Action group counts per month (index 0 = month 1), plus unused actions. */
  actionsByMonth: (GroupCounts & { unused: number })[];
  /** Each group's share (0..1) of the actions used; sums to 1. Not counts. */
  actionShare: Record<ActionGroup, number>;
  crises: DebriefCrisis[];
  votes: {
    /** Share of possible votes that were cast (0..1). */
    participation: number;
    ties: number;
    /** Months that built nothing (tie, 'none' won, or nobody voted). */
    emptyMonths: number;
    /** Mean share of the winning option among votes cast, months that built something. */
    averageWinningShare: number;
  };
  springFoundMonth: number | null;
  players: DebriefPlayer[];
  questions: DebriefQuestion[];
}

/** How the server labels players for the debrief. */
export interface DebriefLabel {
  id: string;
  label: string;
  color: string;
}
