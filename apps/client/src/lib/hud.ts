/** Small pure helpers for the game HUD (clock ring, energy bolts). */

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
