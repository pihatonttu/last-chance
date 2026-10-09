import { readFileSync } from 'node:fs';
import { DEFAULT_PARAMS, type GameParams } from '@saari/rules';

/** Objects become optional all the way down; arrays and tuples stay whole (they are replaced, not merged). */
export type DeepPartial<T> = T extends readonly unknown[]
  ? T
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

type Kind = 'array' | 'object' | 'null' | 'number' | 'string' | 'boolean' | 'other';

function kindOf(value: unknown): Kind {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  const t = typeof value;
  return t === 'object' || t === 'number' || t === 'string' || t === 'boolean' ? t : 'other';
}

function mergeValue(base: unknown, override: unknown, path: string): unknown {
  const baseKind = kindOf(base);
  const overrideKind = kindOf(override);
  if (baseKind !== overrideKind) {
    throw new Error(`params: ${path} must be ${baseKind === 'object' ? 'an object' : `a ${baseKind}`}, got ${overrideKind}`);
  }
  if (overrideKind !== 'object') return structuredClone(override);
  const merged: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(override as Record<string, unknown>)) {
    const keyPath = path ? `${path}.${key}` : key;
    if (!Object.hasOwn(merged, key)) throw new Error(`params: unknown key ${keyPath}`);
    merged[key] = mergeValue(merged[key], value, keyPath);
  }
  return merged;
}

/**
 * A copy of `base` with `partial` laid over it: objects merge key by key, arrays and tuples
 * are replaced whole. Unknown keys and type mismatches throw so a typo cannot pass silently.
 */
export function mergeParams(base: GameParams, partial: DeepPartial<GameParams>): GameParams {
  if (kindOf(partial) !== 'object') throw new Error('params: the override must be a JSON object');
  return mergeValue(structuredClone(base), partial, '') as GameParams;
}

/** Reads a JSON file with a partial params object and lays it over DEFAULT_PARAMS. */
export function loadParams(path: string): GameParams {
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (kindOf(parsed) !== 'object') throw new Error(`params: ${path} must hold a JSON object`);
  return mergeParams(DEFAULT_PARAMS, parsed as DeepPartial<GameParams>);
}
