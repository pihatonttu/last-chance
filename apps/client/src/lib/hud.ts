/** Small pure helpers for the game HUD (phase title, clock ring, energy bolts). */
import type { Phase } from '@saari/rules';
import { t } from '../i18n/index.ts';

export interface PhaseHeading {
  title: string;
  subtitle: string | null;
}

/**
 * The big words at the top of the game (docs/12-selkeys.md §2). A pause wins over the phase.
 * The lobby and the end have screens of their own, so the bar never shows them.
 */
export function phaseHeading(phase: Phase, paused: boolean): PhaseHeading {
  if (paused) return { title: t('bar.title.paused'), subtitle: null };
  switch (phase) {
    case 'vote':
      return { title: t('bar.title.vote'), subtitle: t('bar.subtitle.vote') };
    case 'summary':
      return { title: t('bar.title.summary'), subtitle: t('bar.subtitle.summary') };
    default:
      return { title: t('bar.title.action'), subtitle: t('bar.subtitle.action') };
  }
}

/** stroke-dasharray for a ring that shows `share` (0..1) of its circumference. */
export function ringDash(share: number, radius: number): string {
  const circumference = 2 * Math.PI * radius;
  const k = Number.isFinite(share) ? Math.min(1, Math.max(0, share)) : 0;
  return `${(circumference * k).toFixed(2)} ${circumference.toFixed(2)}`;
}

/** One bolt per action this month; full ones are the actions left. */
export function energyPips(left: number, max: number): boolean[] {
  return Array.from({ length: Math.max(0, max) }, (_, i) => i < left);
}
