import type { DebriefData, DebriefLabel } from '@saari/debrief';
import type { Game } from '@saari/rules';
import type { ServerMessage } from '@saari/protocol';
import type { Debriefing, Naming, Peer } from '../src/session.ts';

const ZERO = { food: 0, fields: 0, materials: 0, explore: 0, skills: 0, recreation: 0 };

/** A minimal, valid DebriefData for store and session tests. */
export function fakeDebrief(labels: readonly DebriefLabel[] = [], named = true): DebriefData {
  return {
    version: 1,
    createdAt: new Date(0).toISOString(),
    named,
    length: 'short',
    totalMonths: 10,
    monthsPlayed: 0,
    endedEarly: false,
    happiness: 0,
    grade: 1,
    villagers: labels.length,
    months: [],
    actionsByMonth: [],
    actionShare: { ...ZERO },
    crises: [],
    votes: { participation: 0, ties: 0, emptyMonths: 0, averageWinningShare: 0 },
    springFoundMonth: null,
    players: labels.map((l) => ({
      id: l.id,
      label: l.label,
      color: l.color,
      actions: { ...ZERO },
      unusedActions: 0,
      education: 1,
      tools: 1,
      votes: [],
    })),
    questions: [{ id: 'decision-making', params: {} }],
  };
}

/**
 * Deterministic stand-in for @saari/names so session tests do not depend on the
 * real word lists: "badword" is offensive, 2..20 letters/digits/spaces are fine.
 */
export const fakeNaming: Naming = {
  check(raw) {
    const nickname = raw.trim().replace(/\s+/g, ' ');
    if (nickname.length === 0) return { ok: false, reason: 'empty' };
    if (nickname.length < 2) return { ok: false, reason: 'too-short' };
    if (nickname.length > 20) return { ok: false, reason: 'too-long' };
    if (/badword/i.test(nickname)) return { ok: false, reason: 'offensive' };
    if (!/^[\p{L}\p{N} ]+$/u.test(nickname)) return { ok: false, reason: 'invalid-chars' };
    return { ok: true, nickname };
  },
  random(random, taken) {
    for (;;) {
      const name = `Satunnainen ${Math.floor(random() * 10_000)}`;
      if (!taken.has(name.toLowerCase())) return name;
    }
  },
  color: (index) => `#00000${index % 10}`,
};

export const fakeDebriefing: Debriefing = {
  build: (_game: Game, labels, now) => ({ ...fakeDebrief(labels, true), createdAt: now.toISOString() }),
  pseudonymize: (d) => ({
    ...d,
    named: false,
    players: d.players.map((p, i) => ({ ...p, label: `Pelaaja ${i + 1}` })),
  }),
};

/** Records everything the session sends; snapshots each message. */
export class FakePeer implements Peer {
  readonly messages: ServerMessage[] = [];
  closed = false;

  send(message: ServerMessage): void {
    this.messages.push(structuredClone(message));
  }

  close(): void {
    this.closed = true;
  }

  all<T extends ServerMessage['t']>(t: T): Extract<ServerMessage, { t: T }>[] {
    return this.messages.filter((m): m is Extract<ServerMessage, { t: T }> => m.t === t);
  }

  last<T extends ServerMessage['t']>(t: T): Extract<ServerMessage, { t: T }> | undefined {
    return this.all(t).at(-1);
  }

  clear(): void {
    this.messages.length = 0;
  }
}

/** Small seeded generator (mulberry32) for deterministic names and bot delays. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
