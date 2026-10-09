import type { Game } from '@saari/rules';
import type { DebriefData, DebriefLabel } from './types.ts';

export * from './types.ts';

/**
 * Builds the debrief of a finished (or early-ended) game from its reports and log.
 * `labels` maps player ids to the label and colour shown; players missing from it
 * get a pseudonym.
 *
 * STUB: implemented by the debrief task. Do not rely on it throwing.
 */
export function buildDebrief(_game: Game, _labels: readonly DebriefLabel[], _now: Date = new Date()): DebriefData {
  throw new Error('buildDebrief is not implemented yet');
}

/** Same debrief with every label replaced by a pseudonym ("Pelaaja 1"...), named = false. */
export function pseudonymize(_debrief: DebriefData): DebriefData {
  throw new Error('pseudonymize is not implemented yet');
}
