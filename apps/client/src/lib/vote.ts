/** Vote options: what they do, their picture, and what is still missing. */
import type { VoteView } from '@saari/protocol';
import type { Resources, VoteOption } from '@saari/rules';
import { t } from '../i18n/index.ts';
import { gatheringUses, shelterPeople, skillGainPerAction } from './rules-info.ts';

export function effectText(option: VoteOption, villagers: number): string {
  if (option.kind === 'none' || option.level === 0) return t('vote.effect.none');
  const level = option.level;
  switch (option.kind) {
    case 'shelter': {
      if (!option.upgrade) return t('vote.effect.shelter', { people: shelterPeople(1, villagers) });
      const before = shelterPeople((level - 1) as 1 | 2, villagers);
      return t('vote.effect.shelterUpgrade', { delta: Math.max(0, shelterPeople(level, villagers) - before) });
    }
    case 'school':
      return t('vote.effect.school', { k: skillGainPerAction(level) });
    case 'workshop':
      return t('vote.effect.workshop', { k: skillGainPerAction(level) });
    case 'gathering':
      return t('vote.effect.gathering', { uses: gatheringUses(level, villagers) });
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
