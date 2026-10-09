import { isOffensive } from './filter.ts';

export type NicknameRefusal = 'empty' | 'too-short' | 'too-long' | 'invalid-chars' | 'offensive';

export type NicknameCheck = { ok: true; nickname: string } | { ok: false; reason: NicknameRefusal };

export const NICKNAME_MIN_LENGTH = 2;
export const NICKNAME_MAX_LENGTH = 16;

/**
 * Letters (any script), each followed by at most two combining marks, ASCII digits,
 * space and hyphen. Marks are needed for scripts such as Devanagari; Latin letters with
 * diacritics are single precomposed letters after NFC.
 */
const ALLOWED_CHARS = /^(?:\p{L}\p{M}{0,2}|[0-9]| |-)+$/u;

/**
 * The generic combining-mark blocks (U+0300 etc.). After NFC no real Latin, Greek or
 * Cyrillic name needs them; they are what strikethrough and "Zalgo" text are made of.
 */
const GENERIC_MARKS = /[̀-ͯ᪰-᫿᷀-᷿⃐-⃿︠-︯]/u;

const HAS_LETTER = /\p{L}/u;

/** NFC, whitespace runs collapsed to one space, trimmed. */
export function cleanNickname(raw: string): string {
  return raw.normalize('NFC').replace(/\s+/gu, ' ').trim();
}

function hasValidChars(name: string): boolean {
  return ALLOWED_CHARS.test(name) && !GENERIC_MARKS.test(name) && HAS_LETTER.test(name);
}

/**
 * Trims, collapses spaces, checks length, the offensive-word filter and allowed characters,
 * in that order. The filter runs before the character check so that "f.u.c.k" is refused
 * as offensive rather than with a hint to remove the dots. Length counts code points after
 * NFC.
 */
export function checkNickname(raw: string): NicknameCheck {
  const nickname = cleanNickname(raw);
  if (nickname === '') return { ok: false, reason: 'empty' };
  const length = Array.from(nickname).length;
  if (length < NICKNAME_MIN_LENGTH) return { ok: false, reason: 'too-short' };
  if (length > NICKNAME_MAX_LENGTH) return { ok: false, reason: 'too-long' };
  if (isOffensive(nickname)) return { ok: false, reason: 'offensive' };
  if (!hasValidChars(nickname)) return { ok: false, reason: 'invalid-chars' };
  return { ok: true, nickname };
}
