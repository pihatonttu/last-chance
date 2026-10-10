import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { allMessageKeys, formatNumber, hasMessage, t, tp } from '../src/i18n/index.ts';
import { ART_STYLES } from '../src/map/kenney.ts';
import {
  ACTION_GROUPS,
  ACTION_KINDS,
  BUILDING_KINDS,
  GRADES,
  ERROR_CODES,
  JOIN_REFUSALS,
  LEVELS,
  NICKNAME_REFUSALS,
  PHASES,
  QUESTION_IDS,
  REFUSALS,
  RESOURCES,
  SKILLS,
  TERRAINS,
  TICKER_KINDS,
  VOTE_REFUSALS,
} from '../src/lib/enums.ts';
import { gradeName, questionText } from '../src/lib/format.ts';

const SRC = fileURLToPath(new URL('../src', import.meta.url));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|svelte)$/.test(name) && !name.endsWith('fi.ts') ? [path] : [];
  });
}

const sources = sourceFiles(SRC).map((path) => ({ path, text: readFileSync(path, 'utf8') }));

/** Literal keys used as t('key') / tp('base', n) anywhere in the client. */
function literalKeys(): { keys: Set<string>; plurals: Set<string> } {
  const keys = new Set<string>();
  const plurals = new Set<string>();
  for (const { text } of sources) {
    for (const m of text.matchAll(/\bt\(\s*(['"])([^'"`]+)\1/g)) keys.add(m[2]!);
    for (const m of text.matchAll(/\btp\(\s*(['"])([^'"`]+)\1/g)) plurals.add(m[2]!);
  }
  return { keys, plurals };
}

/** Keys built from a template literal, one family per runtime list. */
function familyKeys(): string[] {
  const keys: string[] = [];
  for (const terrain of TERRAINS) keys.push(`terrain.${terrain}.name`, `terrain.${terrain}.description`);
  keys.push('terrain.fog.name', 'terrain.fog.description');
  for (const kind of BUILDING_KINDS) {
    keys.push(`building.${kind}.kind`, `building.${kind}.description`);
    for (const level of LEVELS) keys.push(`building.${kind}.${level}`);
  }
  for (const kind of ACTION_KINDS) keys.push(`action.${kind}`);
  for (const phase of PHASES) keys.push(`phase.${phase}`);
  for (const r of REFUSALS) keys.push(`refusal.${r}`);
  for (const r of VOTE_REFUSALS) keys.push(`voteRefusal.${r}`);
  for (const r of JOIN_REFUSALS) keys.push(`joinRefusal.${r}`);
  for (const c of ERROR_CODES) keys.push(`serverError.${c}`);
  for (const r of NICKNAME_REFUSALS) keys.push(`nickname.${r}`);
  for (const k of TICKER_KINDS) keys.push(`ticker.${k}`);
  for (const q of QUESTION_IDS) keys.push(`debrief.question.${q}`);
  for (const g of ACTION_GROUPS) keys.push(`debrief.group.${g}`);
  keys.push('debrief.group.unused');
  for (const grade of GRADES) keys.push(`grade.${grade}`);
  for (const style of ART_STYLES) keys.push(`dev.art.${style}`);
  for (const skill of SKILLS) keys.push(`skill.${skill}`);
  for (const mood of ['good', 'ok', 'bad']) keys.push(`mood.${mood}`);
  for (const gain of [...RESOURCES, 'work', 'recreation', 'education', 'tools']) keys.push(`gain.${gain}.one`, `gain.${gain}.other`);
  for (const crisis of ['hunger', 'no-shelter']) keys.push(`debrief.crisis.${crisis}.one`, `debrief.crisis.${crisis}.other`);
  for (const kind of ['explore', 'plow', 'build-quarry']) keys.push(`yield.workDone.${kind}`);
  for (const terrain of ['forest', 'field', 'quarry']) keys.push(`tile.stock.${terrain}`);
  for (const work of ['plow', 'quarry']) keys.push(`tile.work.${work}`);
  return keys;
}

describe('translations', () => {
  it('every literal key used in .ts and .svelte files exists in fi.ts', () => {
    const { keys, plurals } = literalKeys();
    expect(keys.size).toBeGreaterThan(100);
    const missing = [...keys].filter((k) => !hasMessage(k));
    const missingPlurals = [...plurals].filter((b) => !hasMessage(`${b}.one`) || !hasMessage(`${b}.other`));
    expect(missing).toEqual([]);
    expect(missingPlurals).toEqual([]);
  });

  it('every key family built at runtime is complete', () => {
    const missing = familyKeys().filter((k) => !hasMessage(k));
    expect(missing).toEqual([]);
  });

  it('every Refusal, VoteRefusal, JoinRefusal and QuestionId has a non-empty string', () => {
    for (const r of REFUSALS) expect(t(`refusal.${r}`).length).toBeGreaterThan(5);
    for (const r of VOTE_REFUSALS) expect(t(`voteRefusal.${r}`).length).toBeGreaterThan(5);
    for (const r of JOIN_REFUSALS) expect(t(`joinRefusal.${r}`).length).toBeGreaterThan(5);
    for (const c of ERROR_CODES) expect(t(`serverError.${c}`).length).toBeGreaterThan(5);
    for (const q of QUESTION_IDS) expect(t(`debrief.question.${q}`).length).toBeGreaterThan(10);
  });

  it('every key in fi.ts is used (no dead strings)', () => {
    const { keys, plurals } = literalKeys();
    const used = new Set([...keys, ...familyKeys()]);
    for (const base of plurals) used.add(`${base}.one`).add(`${base}.other`);
    const unused = allMessageKeys().filter((k) => !used.has(k));
    expect(unused).toEqual([]);
  });

  it('question templates fill their params, including the grade name', () => {
    expect(questionText({ id: 'hunger', params: { month: 6, people: 9 } })).toContain('Kuukautena 6');
    expect(questionText({ id: 'hunger', params: { month: 6, people: 9 } })).toContain('9 jäi nälkään');
    const good = questionText({ id: 'good-result', params: { grade: 5 } });
    expect(good).toContain('tasolle 5');
    expect(good).toContain('Kukoistava kylä');
    for (const q of QUESTION_IDS) {
      const text = questionText({ id: q, params: { month: 3, people: 2, months: 4, count: 2, percent: 40, grade: 6 } });
      expect(text).not.toMatch(/\{\w+\}/);
    }
  });
});

describe('t() and tp()', () => {
  it('fills placeholders and formats numbers the Finnish way', () => {
    expect(t('bar.foodValue', { food: 80, need: 96 })).toBe('80 / tarve 96');
    expect(formatNumber(1.25)).toBe('1,25');
    expect(formatNumber(1234).replace(/\s/g, ' ')).toBe('1 234');
    expect(t('gain.work.other', { n: 1.25 })).toBe('+1,25 työtä');
  });

  it('leaves unknown placeholders visible', () => {
    expect(t('bar.foodValue', { food: 1 })).toBe('1 / tarve {need}');
  });

  it('picks the singular only for exactly one', () => {
    expect(tp('gain.wood', 10)).toBe('+10 puuta');
    expect(tp('gain.wood', 1)).toBe('+1 puu');
    expect(tp('gain.food', 0)).toBe('+0 ruokaa');
    expect(tp('vote.votes', 1)).toBe('1 ääni');
  });

  it('grade names follow P32', () => {
    expect(GRADES.map(gradeName)).toEqual([
      'Selviytyjät rannalla',
      'Ahdinko',
      'Sinnittelevä leiri',
      'Toimiva kylä',
      'Kukoistava kylä',
      'Saaren paratiisi',
    ]);
  });
});
