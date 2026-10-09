/**
 * The only things the client keeps in the browser (P14, P23): the host token and the
 * player token per game code, and the sound preference. Every access is guarded
 * because storage can be blocked (private mode, school policies).
 */
const PREFIX = 'saari.';

function read(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(PREFIX + key) ?? null;
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) globalThis.localStorage?.removeItem(PREFIX + key);
    else globalThis.localStorage?.setItem(PREFIX + key, value);
  } catch {
    // Storage blocked: the session still works, it just cannot be resumed after a reload.
  }
}

export const tokens = {
  host: (code: string) => read(`host.${code}`),
  setHost: (code: string, token: string | null) => write(`host.${code}`, token),
  player: (code: string) => read(`player.${code}`),
  setPlayer: (code: string, token: string | null) => write(`player.${code}`, token),
};

export const prefs = {
  get: (key: string) => read(`pref.${key}`),
  set: (key: string, value: string | null) => write(`pref.${key}`, value),
};

/** Tab-only storage for the named debrief (P23: never on the server, gone with the tab). */
export const tabStore = {
  get(key: string): string | null {
    try {
      return globalThis.sessionStorage?.getItem(PREFIX + key) ?? null;
    } catch {
      return null;
    }
  },
  set(key: string, value: string | null): void {
    try {
      if (value === null) globalThis.sessionStorage?.removeItem(PREFIX + key);
      else globalThis.sessionStorage?.setItem(PREFIX + key, value);
    } catch {
      // ignore
    }
  },
};
