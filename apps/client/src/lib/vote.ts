/** Vote options: what they do for the village, their picture, and what is still missing. */
import type { VoteView } from '@saari/protocol';
import type { GameParams, Level, Resources, VoteOption } from '@saari/rules';
import { t, tp } from '../i18n/index.ts';
import { buildingName } from './format.ts';
import {
  actionsPerMonth,
  actionsToNextSkill,
  gatheringMood,
  PARAMS,
  skillGainPerAction,
  toolsExample,
} from './rules-info.ts';

/** The village numbers a card is counted from. */
export interface VoteVillage {
  /** N: how many villagers there are. */
  villagers: number;
  /** Homes now: the number the top bar shows (`village.shelterCapacity`). */
  shelterCapacity: number;
}

/** Everything a vote card says about an option, apart from its price and tally. */
export interface OptionCard {
  /** The building's name, or "Ei rakenneta". */
  name: string;
  /** The map sprite of what the option builds; null for not building. */
  art: string | null;
  /** An upgrade: the sprite of the building that grows, drawn before `art` (old → new). */
  fromArt: string | null;
  /** The one big line: what the village gets, with before → after numbers where it grows. */
  benefit: string;
  /** The small line: what the children must then do. */
  reason: string;
}

/**
 * The option's text. Homes come from the server (`shelterAfter`, counted like the top bar's
 * number); the rest from the same rules the server plays by (`rules-info.ts`).
 */
export function optionCard(option: VoteOption, village: VoteVillage, params: GameParams = PARAMS): OptionCard {
  const { villagers } = village;
  if (option.kind === 'none' || option.level === 0) {
    return { name: t('vote.noneShort'), art: null, fromArt: null, benefit: t('vote.gain.none'), reason: t('vote.why.none') };
  }
  const { kind, level } = option;
  const grows = option.upgrade && level > 1;
  const before = (level - 1) as Level;
  const base = {
    name: buildingName(kind, level),
    art: optionArt(option),
    fromArt: grows ? optionArt({ ...option, level: before }) : null,
  };
  switch (kind) {
    case 'shelter':
      return {
        ...base,
        benefit: t('vote.gain.homes', { from: village.shelterCapacity, to: option.shelterAfter ?? village.shelterCapacity }),
        reason: grows ? t('vote.why.shelterGrows', { name: buildingName(kind, before) }) : t('vote.why.shelterNew'),
      };
    case 'school':
      return grows
        ? {
            ...base,
            benefit: t('vote.gain.studySteps', { from: skillGainPerAction(before), to: skillGainPerAction(level) }),
            reason: t('vote.why.studyFaster'),
          }
        : {
            ...base,
            benefit: t('vote.gain.energy', { from: actionsPerMonth(1, params), to: actionsPerMonth(2, params) }),
            reason: tp('vote.why.study', actionsToNextSkill(level, params)),
          };
    case 'workshop':
      return grows
        ? {
            ...base,
            benefit: t('vote.gain.toolsSteps', { from: skillGainPerAction(before), to: skillGainPerAction(level) }),
            reason: t('vote.why.toolsFaster'),
          }
        : {
            ...base,
            benefit: t('vote.gain.tools', toolsExample(params)),
            reason: tp('vote.why.tools', actionsToNextSkill(level, params)),
          };
    case 'gathering':
      return {
        ...base,
        benefit: grows
          ? t('vote.gain.moodGrow', { from: gatheringMood(before, villagers, params), to: gatheringMood(level, villagers, params) })
          : t('vote.gain.mood', { n: gatheringMood(level, villagers, params) }),
        reason: t('vote.why.gathering'),
      };
  }
}

export function voteShare(vote: VoteView, optionId: string): number {
  const count = vote.counts[optionId] ?? 0;
  return vote.votesCast > 0 ? count / vote.votesCast : 0;
}

/** The picture of what the option builds (the map's own sprite), or null for not building. */
export function optionArt(option: VoteOption): string | null {
  return option.kind === 'none' || option.level === 0 ? null : `props/${option.kind}-${option.level}`;
}

export interface Missing {
  wood: number;
  stone: number;
  /** No free meadow to build on. */
  space: boolean;
}

/** What stops the option, as amounts the class still has to gather. */
export function missingFor(option: VoteOption, resources: Resources): Missing {
  return {
    wood: option.blocked.includes('wood') ? Math.max(0, option.cost.wood - resources.wood) : 0,
    stone: option.blocked.includes('stone') ? Math.max(0, option.cost.stone - resources.stone) : 0,
    space: option.blocked.includes('space'),
  };
}
