/**
 * What the pill under an action button promises: one energy in, this out (docs/12-selkeys.md §2).
 * Pure functions, so the pill's pictures and its spoken label come from the same place.
 */
import type { Resources, Yield } from '@saari/rules';
import { t, tp } from '../i18n/index.ts';
import { maxSkillLevel } from './rules-info.ts';

/** One action always costs one energy. */
export const ENERGY_COST = 1;

/** Up to this many steps are drawn as pips; a longer job is written as "3 / 8". */
export const MAX_PIPS = 6;

/** `done`: a step taken earlier. `add`: the step (or part of it) this action adds. */
export type PipState = 'done' | 'add' | 'empty';

export interface Pip {
  state: PipState;
  /** How much of the pip is lit once the action is done, 0..1 (tools make a step bigger than one). */
  fill: number;
}

export type PillResult =
  | { type: 'resource'; resource: keyof Resources; amount: number }
  | { type: 'pips'; pips: Pip[] }
  | { type: 'count'; after: number; needed: number }
  | { type: 'face' }
  | { type: 'none' };

function share(value: number): number {
  return Math.min(1, Math.max(0, Math.round(value * 1000) / 1000));
}

/** The steps of a job as pips: those done, the one this action adds, and the rest empty. */
function steps(done: number, amount: number, needed: number): PillResult {
  if (!(needed > 0)) return { type: 'none' };
  const after = Math.min(needed, done + amount);
  if (needed > MAX_PIPS) return { type: 'count', after, needed };
  const pips = Array.from({ length: Math.ceil(needed) }, (_, i): Pip => {
    const lit = share(after - i);
    const before = share(done - i);
    return { state: lit <= 0 ? 'empty' : lit > before ? 'add' : 'done', fill: lit };
  });
  return { type: 'pips', pips };
}

/**
 * A skill action at the top level is refused, and the rules give it done 0 of a needed number
 * that is no longer a goal. Showing "1 / 12" there would promise progress that cannot happen.
 */
export function skillMaxed(y: Yield): boolean {
  return y.type === 'progress' && y.level >= maxSkillLevel();
}

export function pillResult(y: Yield): PillResult {
  switch (y.type) {
    case 'resource':
      // A field with nothing left promises nothing; its reason is said under the button.
      return y.amount > 0 ? { type: 'resource', resource: y.resource, amount: y.amount } : { type: 'none' };
    case 'work':
      return steps(y.done, y.amount, y.needed);
    case 'progress':
      return skillMaxed(y) ? { type: 'none' } : steps(y.done, y.amount, y.needed);
    case 'recreation':
      return { type: 'face' };
    case 'none':
      return { type: 'none' };
  }
}

/** "10 puuta" without the plus sign of the chips: read aloud, "plus" would get in the way. */
function resourceWords(resource: keyof Resources, amount: number): string {
  switch (resource) {
    case 'wood':
      return tp('action.amount.wood', amount);
    case 'stone':
      return tp('action.amount.stone', amount);
    case 'food':
      return tp('action.amount.food', amount);
  }
}

/** The button's name for a screen reader: the action, the cost and the gain in words. */
export function actionLabel(action: string, y: Yield): string {
  const cost = t('action.cost');
  switch (y.type) {
    case 'resource':
      return y.amount > 0
        ? t('action.label.resource', { action, cost, gain: resourceWords(y.resource, y.amount) })
        : t('action.label', { action, cost });
    case 'work': {
      const after = Math.min(y.needed, y.done + y.amount);
      return t('action.label.work', { action, cost, after, needed: y.needed });
    }
    case 'progress': {
      if (skillMaxed(y)) return t('action.label', { action, cost });
      const after = Math.min(y.needed, y.done + y.amount);
      return t('action.label.progress', { action, cost, after, needed: y.needed });
    }
    case 'recreation':
      return t('action.label.recreation', { action, cost });
    case 'none':
      return t('action.label', { action, cost });
  }
}

/** The button's name while the server answers: what the button shows, then the full label. */
export function pendingLabel(label: string): string {
  return t('action.pendingLabel', { pending: t('action.pending'), label });
}
