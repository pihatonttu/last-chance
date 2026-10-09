import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DEFAULT_PARAMS } from '@saari/rules';
import { afterAll, describe, expect, it } from 'vitest';
import { loadParams, mergeParams } from '../src/params-file.ts';

describe('mergeParams', () => {
  const snapshot = structuredClone(DEFAULT_PARAMS);

  it('overrides only the nested keys given', () => {
    const merged = mergeParams(DEFAULT_PARAMS, {
      costs: { school: [{ wood: 1, stone: 0 }, { wood: 2, stone: 1 }, { wood: 3, stone: 2 }] },
      map: { landBase: 20 },
    });
    expect(merged.costs.school).toEqual([
      { wood: 1, stone: 0 },
      { wood: 2, stone: 1 },
      { wood: 3, stone: 2 },
    ]);
    expect(merged.costs.shelter).toEqual(DEFAULT_PARAMS.costs.shelter);
    expect(merged.costs.workshop).toEqual(DEFAULT_PARAMS.costs.workshop);
    expect(merged.map.landBase).toBe(20);
    expect(merged.map.landPerVillager).toBe(DEFAULT_PARAMS.map.landPerVillager);
    expect(merged.map.forestShare).toBe(DEFAULT_PARAMS.map.forestShare);
    expect(merged.harvestYield).toBe(DEFAULT_PARAMS.harvestYield);
  });

  it('replaces arrays and tuples whole', () => {
    const merged = mergeParams(DEFAULT_PARAMS, { shelterDivisors: [8, 4, 2], gradeThresholds: [-50, 0, 30, 60, 90] });
    expect(merged.shelterDivisors).toEqual([8, 4, 2]);
    expect(merged.gradeThresholds).toEqual([-50, 0, 30, 60, 90]);
  });

  it('merges a top-level record and keeps its other keys', () => {
    const merged = mergeParams(DEFAULT_PARAMS, { months: { short: 6 } });
    expect(merged.months).toEqual({ normal: DEFAULT_PARAMS.months.normal, short: 6 });
  });

  it('never mutates the base', () => {
    const merged = mergeParams(DEFAULT_PARAMS, { map: { landBase: 99 }, costs: { shelter: [{ wood: 0, stone: 0 }, { wood: 0, stone: 0 }, { wood: 0, stone: 0 }] } });
    expect(DEFAULT_PARAMS).toEqual(snapshot);
    expect(merged.map).not.toBe(DEFAULT_PARAMS.map);
  });

  it('rejects keys the params do not have, so typos do not pass silently', () => {
    expect(() => mergeParams(DEFAULT_PARAMS, { harvestYeild: 3 } as never)).toThrow(/harvestYeild/);
    expect(() => mergeParams(DEFAULT_PARAMS, { map: { landBse: 3 } } as never)).toThrow(/map\.landBse/);
  });

  it('rejects an object where the base has a number', () => {
    expect(() => mergeParams(DEFAULT_PARAMS, { harvestYield: { a: 1 } } as never)).toThrow(/harvestYield/);
  });
});

describe('loadParams', () => {
  const dir = mkdtempSync(join(tmpdir(), 'saari-sim-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('reads a partial JSON file onto the defaults', () => {
    const file = join(dir, 'p.json');
    writeFileSync(file, JSON.stringify({ costs: { school: [{ wood: 1, stone: 0 }, { wood: 1, stone: 1 }, { wood: 1, stone: 2 }] }, map: { landBase: 14 } }));
    const params = loadParams(file);
    expect(params.map.landBase).toBe(14);
    expect(params.costs.school[0]).toEqual({ wood: 1, stone: 0 });
    expect(params.costs.gathering).toEqual(DEFAULT_PARAMS.costs.gathering);
    expect(params.foodPerVillager).toBe(DEFAULT_PARAMS.foodPerVillager);
  });

  it('refuses a file that is not a JSON object', () => {
    const file = join(dir, 'bad.json');
    writeFileSync(file, '[1, 2]');
    expect(() => loadParams(file)).toThrow(/object/);
  });
});
