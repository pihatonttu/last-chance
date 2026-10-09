/** Paths of the app. Pure parsing so it can be unit-tested. */
export type Route =
  | { name: 'home'; code: string | null }
  | { name: 'create' }
  | { name: 'host'; code: string }
  | { name: 'play'; code: string }
  | { name: 'debrief'; token: string }
  | { name: 'privacy' }
  | { name: 'help' }
  | { name: 'not-found' };

export const CODE_PATTERN = /^\d{6}$/;

export function isGameCode(value: string): boolean {
  return CODE_PATTERN.test(value);
}

/** Keeps digits only, at most six: "123 456" and "123-456" both become "123456". */
export function normalizeCode(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 6);
}

export function parseRoute(pathname: string, search: string): Route {
  const parts = pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const [first, second] = parts;
  if (parts.length === 0) return { name: 'home', code: null };
  if (parts.length === 1) {
    switch (first) {
      case 'opettaja':
        return { name: 'create' };
      case 'tietosuoja':
        return { name: 'privacy' };
      case 'ohje':
        return { name: 'help' };
      case 'join': {
        // QR / shared link alias: /join?code=123456
        const code = normalizeCode(new URLSearchParams(search).get('code') ?? '');
        return isGameCode(code) ? { name: 'play', code } : { name: 'home', code: code || null };
      }
    }
  }
  if (parts.length === 2 && second !== undefined) {
    if (first === 'host' && isGameCode(second)) return { name: 'host', code: second };
    if (first === 'play' && isGameCode(second)) return { name: 'play', code: second };
    if (first === 'debrief' && /^[A-Za-z0-9_-]{8,128}$/.test(second)) return { name: 'debrief', token: second };
  }
  return { name: 'not-found' };
}
