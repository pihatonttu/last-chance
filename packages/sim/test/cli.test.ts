import { describe, expect, it } from 'vitest';
import { parseArgs, scenariosFor, STANDARD_SCENARIOS } from '../src/cli.ts';

describe('parseArgs', () => {
  it('has defaults', () => {
    expect(parseArgs([])).toEqual({
      seeds: 40,
      villagers: [2, 15, 30],
      params: null,
      json: null,
      only: null,
      short: false,
    });
  });

  it('reads every flag', () => {
    expect(
      parseArgs(['--seeds', '20', '--villagers', '6,12', '--params', 'p.json', '--json', 'out.json', '--only', 'cooperative,mixed', '--short']),
    ).toEqual({
      seeds: 20,
      villagers: [6, 12],
      params: 'p.json',
      json: 'out.json',
      only: ['cooperative', 'mixed'],
      short: true,
    });
  });

  it('accepts --flag=value and ignores the bare -- that pnpm passes on', () => {
    expect(parseArgs(['--', '--seeds=5', '--villagers=4'])).toMatchObject({ seeds: 5, villagers: [4] });
  });

  it('rejects bad input', () => {
    expect(() => parseArgs(['--seeds', '0'])).toThrow(/--seeds/);
    expect(() => parseArgs(['--seeds', 'x'])).toThrow(/--seeds/);
    expect(() => parseArgs(['--seeds'])).toThrow(/--seeds/);
    expect(() => parseArgs(['--villagers', '2,,a'])).toThrow(/--villagers/);
    expect(() => parseArgs(['--only', 'heroic'])).toThrow(/heroic/);
    expect(() => parseArgs(['--fast'])).toThrow(/--fast/);
  });
});

describe('scenariosFor', () => {
  it('names the five standard class mixes', () => {
    expect(STANDARD_SCENARIOS.map((s) => s.name)).toEqual(['cooperative', 'mixed', 'random', 'selfish', 'lazy']);
    expect(STANDARD_SCENARIOS.find((s) => s.name === 'mixed')!.mix).toEqual({ cooperative: 0.6, random: 0.25, lazy: 0.15 });
  });

  it('runs every scenario at every villager count', () => {
    const list = scenariosFor(parseArgs(['--villagers', '2,15']));
    expect(list.map((s) => s.label)).toEqual([
      'cooperative N=2',
      'cooperative N=15',
      'mixed N=2',
      'mixed N=15',
      'random N=2',
      'random N=15',
      'selfish N=2',
      'selfish N=15',
      'lazy N=2',
      'lazy N=15',
    ]);
    expect(list.every((s) => s.length === 'normal')).toBe(true);
  });

  it('filters with --only and adds short games for cooperative, mixed and random with --short', () => {
    const list = scenariosFor(parseArgs(['--villagers', '15', '--only', 'cooperative,lazy', '--short']));
    expect(list.map((s) => [s.label, s.length])).toEqual([
      ['cooperative N=15', 'normal'],
      ['cooperative N=15 short', 'short'],
      ['lazy N=15', 'normal'],
    ]);
  });
});
