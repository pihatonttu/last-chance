/** Text for vote options: cost, effect and why an option cannot be chosen. */
import type { VoteView } from '@saari/protocol';
import type { Resources, VoteOption } from '@saari/rules';
import { t } from '../i18n/index.ts';
import { buildingName } from './format.ts';
import { gatheringUses, shelterPeople, skillGainPerAction } from './rules-info.ts';

export function costParts(option: VoteOption): string[] {
  const parts: string[] = [];
  if (option.cost.wood > 0) parts.push(t('vote.cost.wood', { n: option.cost.wood }));
  if (option.cost.stone > 0) parts.push(t('vote.cost.stone', { n: option.cost.stone }));
  return parts.length > 0 ? parts : [t('vote.free')];
}

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

/** "Teltta → Maja" for upgrades, "Uusi teltta" style otherwise. */
export function upgradeText(option: VoteOption): string | null {
  if (option.kind === 'none' || option.level === 0 || !option.upgrade) return null;
  const from = buildingName(option.kind, (option.level - 1) as 1 | 2);
  const to = buildingName(option.kind, option.level);
  return from === to ? null : t('vote.upgrade', { from, to });
}

export function blockedReasons(option: VoteOption, resources: Resources): string[] {
  return option.blocked.map((block) => {
    switch (block) {
      case 'wood':
        return t('vote.blocked.wood', { have: resources.wood, need: option.cost.wood });
      case 'stone':
        return t('vote.blocked.stone', { have: resources.stone, need: option.cost.stone });
      case 'space':
        return t('vote.blocked.space');
    }
  });
}

export function voteShare(vote: VoteView, optionId: string): number {
  const count = vote.counts[optionId] ?? 0;
  return vote.votesCast > 0 ? count / vote.votesCast : 0;
}
