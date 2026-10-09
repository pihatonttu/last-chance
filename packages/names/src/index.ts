/**
 * Nicknames: validation with a profanity filter (P12), random replacement names for
 * the teacher's "rename" button (P13), pseudonyms for stored debriefs (P23) and the
 * player colour palette. Pure functions, browser- and Node-safe, no dependencies.
 *
 * STUBS: implemented by the names task.
 */

export type NicknameRefusal = 'empty' | 'too-short' | 'too-long' | 'invalid-chars' | 'offensive';

export type NicknameCheck = { ok: true; nickname: string } | { ok: false; reason: NicknameRefusal };

/** Trims, collapses spaces, checks length, allowed characters and the offensive-word filter. */
export function checkNickname(_raw: string): NicknameCheck {
  throw new Error('checkNickname is not implemented yet');
}

/** Random friendly name ("Punainen kettu") not in `taken` (case-insensitive). */
export function randomNickname(_random: () => number, _taken: ReadonlySet<string>): string {
  throw new Error('randomNickname is not implemented yet');
}

/** "Pelaaja 7" for index 7 (1-based). */
export function pseudonym(_index: number): string {
  throw new Error('pseudonym is not implemented yet');
}

/** Distinct, colour-blind-friendly player colours as CSS hex strings. */
export const PLAYER_COLORS: readonly string[] = [];
