/**
 * Runtime lists of the string unions the client renders. Each list is built from a
 * Record over the union, so the compiler fails here when a package adds a member.
 */
import type { ActionGroup, QuestionId } from '@saari/debrief';
import type { NicknameRefusal } from '@saari/names';
import type { ErrorCode, JoinRefusal, TickerEvent } from '@saari/protocol';
import type {
  ActionKind,
  BuildingKind,
  Level,
  Phase,
  Refusal,
  Resources,
  Skill,
  Terrain,
  VoteBlock,
  VoteRefusal,
} from '@saari/rules';

function keys<T extends string>(record: Record<T, true>): readonly T[] {
  return Object.keys(record) as T[];
}

export const TERRAINS = keys<Terrain>({
  sea: true,
  meadow: true,
  forest: true,
  rock: true,
  spring: true,
  field: true,
  quarry: true,
});

export const BUILDING_KINDS = keys<BuildingKind>({ shelter: true, school: true, workshop: true, gathering: true });

export const LEVELS: readonly Level[] = [1, 2, 3];

export const ACTION_KINDS = keys<ActionKind>({
  explore: true,
  plow: true,
  harvest: true,
  fish: true,
  chop: true,
  'build-quarry': true,
  mine: true,
  swim: true,
  gather: true,
  study: true,
  'make-tools': true,
});

export const PHASES = keys<Phase>({ lobby: true, action: true, vote: true, summary: true, ended: true });

export const RESOURCES = keys<keyof Resources>({ food: true, wood: true, stone: true });

export const SKILLS = keys<Skill>({ education: true, tools: true });

export const REFUSALS = keys<Refusal>({
  'unknown-player': true,
  removed: true,
  'wrong-phase': true,
  'out-of-bounds': true,
  'no-actions-left': true,
  'not-explorable': true,
  'deep-sea': true,
  'field-empty': true,
  'quarry-empty': true,
  'no-uses-left': true,
  'max-level': true,
  'no-action': true,
});

export const VOTE_REFUSALS = keys<VoteRefusal>({
  'wrong-phase': true,
  'unknown-player': true,
  removed: true,
  'unknown-option': true,
  blocked: true,
});

export const VOTE_BLOCKS = keys<VoteBlock>({ wood: true, stone: true, space: true });

export const JOIN_REFUSALS = keys<JoinRefusal>({
  'unknown-game': true,
  'join-closed': true,
  'game-ended': true,
  'nickname-invalid': true,
  'nickname-offensive': true,
  'nickname-taken': true,
  kicked: true,
  'bad-token': true,
  'protocol-mismatch': true,
});

export const ERROR_CODES = keys<ErrorCode>({
  'bad-message': true,
  'server-error': true,
  'not-joined': true,
  'already-joined': true,
  'unexpected-message': true,
  'game-closed': true,
  replaced: true,
  'not-a-player': true,
  'not-host': true,
  'wrong-phase': true,
  'no-players': true,
  'unknown-player': true,
});

export const NICKNAME_REFUSALS = keys<NicknameRefusal>({
  empty: true,
  'too-short': true,
  'too-long': true,
  'invalid-chars': true,
  offensive: true,
});

export const TICKER_KINDS = keys<TickerEvent['kind']>({
  'spring-found': true,
  'field-ready': true,
  'quarry-ready': true,
  'forest-cleared': true,
  built: true,
  tie: true,
  'player-joined': true,
  'food-short': true,
});

export const QUESTION_IDS = keys<QuestionId>({
  hunger: true,
  'no-shelter-long': true,
  ties: true,
  'empty-months': true,
  'skills-heavy': true,
  'skills-none': true,
  'spring-late': true,
  'spring-never': true,
  'unused-actions': true,
  'low-participation': true,
  'good-result': true,
  'next-time': true,
  roles: true,
  'decision-making': true,
});

export const ACTION_GROUPS = keys<ActionGroup>({
  food: true,
  fields: true,
  materials: true,
  explore: true,
  skills: true,
  recreation: true,
});

export const GRADES = [1, 2, 3, 4, 5, 6] as const;
export type Grade = (typeof GRADES)[number];
