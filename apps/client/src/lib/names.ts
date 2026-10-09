/**
 * Safe wrappers around @saari/names. The package is being written in parallel; until
 * it is, its functions throw and these fall back to simple local rules so the UI and
 * the mock server keep working. The server always checks nicknames again.
 */
import * as names from '@saari/names';
import type { NicknameCheck } from '@saari/names';

const FALLBACK_MIN = 2;
const FALLBACK_MAX = 20;

const FALLBACK_COLORS: readonly string[] = [
  '#0072b2',
  '#e69f00',
  '#009e73',
  '#cc79a7',
  '#d55e00',
  '#56b4e9',
  '#7a5195',
  '#8c6d31',
  '#2f4b7c',
  '#b8860b',
  '#3b8b3b',
  '#c0392b',
];

const FALLBACK_ADJECTIVES = ['Punainen', 'Sininen', 'Vihreä', 'Keltainen', 'Iloinen', 'Nopea', 'Viisas', 'Rohkea'];
const FALLBACK_ANIMALS = ['kettu', 'lokki', 'hylje', 'orava', 'pöllö', 'siili', 'majava', 'ilves', 'kurki', 'jänis'];

function fallbackCheck(raw: string): NicknameCheck {
  const nickname = raw.trim().replace(/\s+/g, ' ');
  if (nickname.length === 0) return { ok: false, reason: 'empty' };
  if (nickname.length < FALLBACK_MIN) return { ok: false, reason: 'too-short' };
  if (nickname.length > FALLBACK_MAX) return { ok: false, reason: 'too-long' };
  if (!/^[\p{L}\p{N} _-]+$/u.test(nickname)) return { ok: false, reason: 'invalid-chars' };
  return { ok: true, nickname };
}

export function checkNickname(raw: string): NicknameCheck {
  try {
    return names.checkNickname(raw);
  } catch {
    return fallbackCheck(raw);
  }
}

export function randomNickname(random: () => number, taken: ReadonlySet<string>): string {
  try {
    return names.randomNickname(random, taken);
  } catch {
    const lower = new Set([...taken].map((n) => n.toLowerCase()));
    for (let i = 0; i < 200; i++) {
      const a = FALLBACK_ADJECTIVES[Math.floor(random() * FALLBACK_ADJECTIVES.length)]!;
      const b = FALLBACK_ANIMALS[Math.floor(random() * FALLBACK_ANIMALS.length)]!;
      const name = i < 100 ? `${a} ${b}` : `${a} ${b} ${i}`;
      if (!lower.has(name.toLowerCase())) return name;
    }
    return `Pelaaja ${taken.size + 1}`;
  }
}

export function pseudonym(index: number): string {
  try {
    return names.pseudonym(index);
  } catch {
    return `Pelaaja ${index}`;
  }
}

export function playerColors(): readonly string[] {
  return names.PLAYER_COLORS.length > 0 ? names.PLAYER_COLORS : FALLBACK_COLORS;
}

export function playerColor(index: number): string {
  const colors = playerColors();
  return colors[index % colors.length]!;
}
