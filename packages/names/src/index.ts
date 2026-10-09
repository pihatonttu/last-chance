/**
 * Nicknames: validation with a profanity filter (P12), random replacement names for
 * the teacher's "rename" button (P13), pseudonyms for stored debriefs (P23) and the
 * player colour palette. Pure functions, browser- and Node-safe, no dependencies.
 *
 * Word lists and every judgement call about borderline words: src/blocklist.ts.
 */

export { checkNickname, type NicknameCheck, type NicknameRefusal } from './nickname.ts';
export { normalizeForFilter } from './normalize.ts';
export { findOffensiveTerm } from './filter.ts';
export { randomNickname } from './random-names.ts';
export { colorFor, PLAYER_COLORS, textColorOn } from './colors.ts';

/** "Pelaaja 7" for index 7 (1-based). Throws a RangeError for anything but an integer >= 1. */
export function pseudonym(index: number): string {
  if (!Number.isInteger(index) || index < 1) {
    throw new RangeError(`pseudonym: index must be an integer >= 1, got ${index}`);
  }
  return `Pelaaja ${index}`;
}
