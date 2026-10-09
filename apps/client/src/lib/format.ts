/** Text for game values. Everything goes through the translation file. */
import type { DebriefQuestion } from '@saari/debrief';
import type { TickerEvent } from '@saari/protocol';
import type { ActionKind, BuildingKind, Gain, Level, PublicTile, Terrain, VoteOption, Yield } from '@saari/rules';
import { formatNumber, t, tp, type MessageKey } from '../i18n/index.ts';
import { parseOptionId } from './rules-info.ts';

export function gradeName(grade: number): string {
  const clamped = Math.min(6, Math.max(1, Math.round(grade))) as 1 | 2 | 3 | 4 | 5 | 6;
  return t(`grade.${clamped}`);
}

export function terrainName(tile: Pick<PublicTile, 'fog' | 'terrain'>): string {
  return tile.fog || tile.terrain === null ? t('terrain.fog.name') : t(`terrain.${tile.terrain}.name`);
}

export function terrainDescription(tile: Pick<PublicTile, 'fog' | 'terrain'>): string {
  return tile.fog || tile.terrain === null ? t('terrain.fog.description') : t(`terrain.${tile.terrain}.description`);
}

export function terrainKeyName(terrain: Terrain): string {
  return t(`terrain.${terrain}.name`);
}

export function buildingName(kind: BuildingKind, level: Level): string {
  return t(`building.${kind}.${level}`);
}

/** "Koulu (taso 2)"; level names that already differ (Teltta/Maja/Talo) stay plain. */
export function buildingTitle(kind: BuildingKind, level: Level): string {
  const name = buildingName(kind, level);
  return kind === 'school' || kind === 'workshop' ? t('building.withLevel', { name, level }) : name;
}

export function optionName(option: Pick<VoteOption, 'id'>): string {
  const parsed = parseOptionId(option.id);
  return parsed ? buildingTitle(parsed.kind, parsed.level) : t('building.none');
}

export function actionName(kind: ActionKind): string {
  return t(`action.${kind}`);
}

type GainKey = keyof Gain;
const GAIN_ORDER: readonly GainKey[] = ['food', 'wood', 'stone', 'work', 'recreation', 'education', 'tools'];

/** One label per non-zero part of a gain, e.g. ["+10 puuta"]. */
export function gainParts(gain: Gain): { key: GainKey; text: string }[] {
  const parts: { key: GainKey; text: string }[] = [];
  for (const key of GAIN_ORDER) {
    const amount = gain[key];
    if (amount === undefined || amount === 0) continue;
    parts.push({ key, text: tp(`gain.${key}`, amount) });
  }
  return parts;
}

export function gainText(gain: Gain): string {
  return gainParts(gain)
    .map((p) => p.text)
    .join(', ');
}

/** The gain an action preview promises, e.g. "+10 puuta"; empty for 'none'. */
export function yieldGain(y: Yield): string {
  switch (y.type) {
    case 'resource':
      return tp(`gain.${y.resource}`, y.amount);
    case 'work':
      return tp('gain.work', y.amount);
    case 'recreation':
      return tp('gain.recreation', 1);
    case 'progress':
      return tp(`gain.${y.skill}`, y.amount);
    case 'none':
      return '';
  }
}

export function tickerText(event: TickerEvent): string {
  switch (event.kind) {
    case 'built':
      return t('ticker.built', { name: optionName({ id: event.option }) });
    case 'food-short':
      return t('ticker.food-short', { missing: event.missing });
    default:
      return t(`ticker.${event.kind}`);
  }
}

/** Discussion question from its template; adds {gradeName} for the grade param. */
export function questionText(question: DebriefQuestion): string {
  const params: Record<string, string | number> = { ...question.params };
  const grade = question.params['grade'];
  if (grade !== undefined) params['gradeName'] = gradeName(grade);
  return t(`debrief.question.${question.id}` as MessageKey, params);
}

/** "123 456" for reading the join code aloud from the projector. */
export function spacedCode(code: string): string {
  return code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
}

export function seconds(ms: number): number {
  return Math.max(0, Math.ceil(ms / 1000));
}

export function percent(share: number): string {
  return t('common.percent', { n: Math.round(share * 100) });
}

export { formatNumber };
