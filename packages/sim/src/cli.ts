import { writeFileSync } from 'node:fs';
import type { ClassMix } from '@saari/bots';
import type { GameLength, GameParams } from '@saari/rules';
import { summarize } from './aggregate.ts';
import { loadParams } from './params-file.ts';
import { markdownReport } from './report.ts';
import { simulate } from './simulate.ts';

export interface CliOptions {
  /** Seeds 1..seeds. */
  seeds: number;
  villagers: number[];
  /** Partial params JSON laid over the defaults. */
  params: string | null;
  /** Where to write the raw metrics. */
  json: string | null;
  /** Scenario names to run; null runs all. */
  only: string[] | null;
  /** Also run short games for cooperative, mixed and random. */
  short: boolean;
}

export interface StandardScenario {
  name: string;
  mix: ClassMix;
  /** Gets a short-game variant with --short. */
  short: boolean;
}

export const STANDARD_SCENARIOS: readonly StandardScenario[] = [
  { name: 'cooperative', mix: { cooperative: 1 }, short: true },
  { name: 'mixed', mix: { cooperative: 0.6, random: 0.25, lazy: 0.15 }, short: true },
  { name: 'random', mix: { random: 1 }, short: true },
  { name: 'selfish', mix: { selfish: 1 }, short: false },
  { name: 'lazy', mix: { lazy: 1 }, short: false },
];

export interface Scenario {
  name: string;
  label: string;
  mix: ClassMix;
  villagers: number;
  length: GameLength;
}

export const USAGE = `usage: node src/cli.ts [--seeds N] [--villagers 2,15,30] [--params p.json] [--json out.json]
                       [--only ${STANDARD_SCENARIOS.map((s) => s.name).join(',')}] [--short]`;

function positiveInt(flag: string, text: string): number {
  const n = Number(text);
  if (!/^\d+$/.test(text.trim()) || !Number.isSafeInteger(n) || n < 1) {
    throw new Error(`${flag} needs a positive whole number, got "${text}"`);
  }
  return n;
}

/** Parses the command line (without the node and script paths). Throws with a readable message. */
export function parseArgs(argv: readonly string[]): CliOptions {
  const options: CliOptions = { seeds: 40, villagers: [2, 15, 30], params: null, json: null, only: null, short: false };
  const args = [...argv];
  while (args.length > 0) {
    const arg = args.shift()!;
    if (arg === '--') continue;
    const eq = arg.indexOf('=');
    const flag = arg.startsWith('--') && eq > 0 ? arg.slice(0, eq) : arg;
    const inline = arg.startsWith('--') && eq > 0 ? arg.slice(eq + 1) : undefined;
    const value = (): string => {
      const v = inline ?? args.shift();
      if (v === undefined || v === '') throw new Error(`${flag} needs a value`);
      return v;
    };
    switch (flag) {
      case '--seeds':
        options.seeds = positiveInt(flag, value());
        break;
      case '--villagers':
        options.villagers = value()
          .split(',')
          .map((part) => positiveInt(flag, part));
        break;
      case '--params':
        options.params = value();
        break;
      case '--json':
        options.json = value();
        break;
      case '--only': {
        const names = value()
          .split(',')
          .map((s) => s.trim());
        const known = STANDARD_SCENARIOS.map((s) => s.name);
        const unknown = names.filter((n) => !known.includes(n));
        if (unknown.length > 0) throw new Error(`--only: unknown scenario ${unknown.join(', ')} (known: ${known.join(', ')})`);
        options.only = names;
        break;
      }
      case '--short':
        if (inline !== undefined) throw new Error('--short takes no value');
        options.short = true;
        break;
      default:
        throw new Error(`unknown argument ${arg}`);
    }
  }
  return options;
}

/** Every scenario the options ask for: per standard mix, each villager count, then its short games. */
export function scenariosFor(options: CliOptions): Scenario[] {
  const list: Scenario[] = [];
  for (const s of STANDARD_SCENARIOS) {
    if (options.only && !options.only.includes(s.name)) continue;
    const lengths: GameLength[] = options.short && s.short ? ['normal', 'short'] : ['normal'];
    for (const length of lengths) {
      for (const villagers of options.villagers) {
        list.push({
          name: s.name,
          label: `${s.name} N=${villagers}${length === 'short' ? ' short' : ''}`,
          mix: s.mix,
          villagers,
          length,
        });
      }
    }
  }
  return list;
}

export function main(argv: readonly string[]): void {
  let options: CliOptions;
  try {
    options = parseArgs(argv);
  } catch (error) {
    process.stderr.write(`${(error as Error).message}\n${USAGE}\n`);
    process.exitCode = 2;
    return;
  }

  let params: GameParams | undefined;
  try {
    params = options.params ? loadParams(options.params) : undefined;
  } catch (error) {
    process.stderr.write(`${(error as Error).message}\n`);
    process.exitCode = 2;
    return;
  }
  const seeds = Array.from({ length: options.seeds }, (_, i) => i + 1);
  const started = performance.now();

  const results = scenariosFor(options).map((scenario) => {
    const t0 = performance.now();
    const metrics = simulate({
      mix: scenario.mix,
      villagers: scenario.villagers,
      length: scenario.length,
      seeds,
      ...(params ? { params } : {}),
    });
    process.stderr.write(`${scenario.label}: ${seeds.length} games in ${((performance.now() - t0) / 1000).toFixed(1)} s\n`);
    return { scenario, metrics, summary: summarize(metrics) };
  });

  process.stdout.write(markdownReport(results.map((r) => ({ label: r.scenario.label, summary: r.summary }))));

  if (options.json) {
    const out = {
      seeds: options.seeds,
      params: options.params,
      scenarios: results.map((r) => ({ ...r.scenario, summary: r.summary, metrics: r.metrics })),
    };
    writeFileSync(options.json, `${JSON.stringify(out, null, 2)}\n`);
    process.stderr.write(`wrote ${options.json}\n`);
  }

  process.stderr.write(`wall time ${((performance.now() - started) / 1000).toFixed(1)} s\n`);
}

if (import.meta.main) main(process.argv.slice(2));
