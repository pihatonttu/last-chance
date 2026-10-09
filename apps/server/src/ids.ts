import { randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

const MAX_CODE_TRIES = 1000;

/** 6-digit join code (100000..999999, so no leading zero) that `isTaken` rejects. */
export function newJoinCode(
  isTaken: (code: string) => boolean,
  random: (min: number, max: number) => number = randomInt,
): string {
  for (let i = 0; i < MAX_CODE_TRIES; i++) {
    const code = String(random(100_000, 1_000_000));
    if (!isTaken(code)) return code;
  }
  throw new Error('no free join code');
}

/** Unguessable token (host, player, debrief): `bytes` random bytes as base64url. */
export function newSecret(bytes = 24): string {
  return randomBytes(bytes).toString('base64url');
}

/** Seed for the island generator. */
export function newSeed(): number {
  return randomInt(0, 2 ** 32);
}

/** Constant-time comparison of two secrets. */
export function sameSecret(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
