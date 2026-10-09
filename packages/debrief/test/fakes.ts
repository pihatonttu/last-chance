import type { ActionKind, LogEntry, LogEvent, MonthReport, Phase, VoteResolution } from '@saari/rules';

export interface ReportOptions {
  villagers?: number;
  hungry?: number;
  unsheltered?: number;
  vote?: VoteResolution;
  unused?: number;
}

/** A month report where everyone is fed and sheltered unless the options say otherwise. */
export function report(month: number, o: ReportOptions = {}): MonthReport {
  const villagers = o.villagers ?? 10;
  const unsheltered = o.unsheltered ?? 0;
  return {
    month,
    villagers,
    vote: o.vote ?? { outcome: 'none', counts: { none: villagers } },
    food: { before: 40, need: 40, eaten: 40, hungry: o.hungry ?? 0, spoiled: 0, after: 0 },
    shelter: { share: unsheltered > 0 ? 0.5 : 1, capacity: villagers - unsheltered, unsheltered },
    recreation: 0,
    mood: { food: 2, shelter: 2, recreation: 0, total: 4 },
    happiness: 4 * month,
    unusedActions: o.unused ?? 0,
  };
}

/** Reports for months 1..n, one row per month. */
export function reports(rows: readonly ReportOptions[]): MonthReport[] {
  return rows.map((row, i) => report(i + 1, row));
}

export function built(option: string, counts: Record<string, number>): VoteResolution {
  return { outcome: 'built', counts, option, x: 0, y: 0 };
}

export function tie(counts: Record<string, number>): VoteResolution {
  return { outcome: 'tie', counts };
}

export function noneWon(counts: Record<string, number>): VoteResolution {
  return { outcome: 'none', counts };
}

export function noVotes(): VoteResolution {
  return { outcome: 'no-votes', counts: { none: 0 } };
}

/**
 * Writes a game log by hand, stamping month, phase and seq the way the engine does.
 * month(m) starts the action phase of month m, votePhase() the vote phase,
 * result() resolves the vote and moves to the summary.
 */
export class LogBuilder {
  readonly entries: LogEntry[] = [];
  #month = 0;
  #phase: Phase = 'lobby';
  #ballots = new Map<string, string>();

  add(event: LogEvent): this {
    this.entries.push({ ...event, seq: this.entries.length + 1, t: 0, month: this.#month, phase: this.#phase } as LogEntry);
    return this;
  }

  join(...ids: string[]): this {
    const countsFromMonth = this.#phase === 'lobby' ? 1 : this.#month + 1;
    for (const player of ids) this.add({ type: 'player-joined', player, countsFromMonth });
    return this;
  }

  remove(player: string): this {
    this.#ballots.delete(player);
    return this.add({ type: 'player-removed', player });
  }

  month(m: number): this {
    this.#month = m;
    this.#phase = 'action';
    this.#ballots.clear();
    return this.add({ type: 'phase', to: 'action' });
  }

  act(player: string, kind: ActionKind, times = 1): this {
    for (let i = 0; i < times; i++) this.add({ type: 'action', player, kind, x: 0, y: 0, gain: {} });
    return this;
  }

  unused(player: string, count: number): this {
    return this.add({ type: 'actions-unused', player, count });
  }

  votePhase(): this {
    this.#phase = 'vote';
    return this.add({ type: 'phase', to: 'vote' });
  }

  vote(player: string, option: string): this {
    const previous = this.#ballots.get(player) ?? null;
    this.#ballots.set(player, option);
    return this.add({ type: 'vote', player, option, previous });
  }

  result(result: VoteResolution): this {
    this.add({ type: 'vote-result', result });
    this.#phase = 'summary';
    return this.add({ type: 'phase', to: 'summary' });
  }

  spring(): this {
    return this.add({ type: 'spring-found', x: 0, y: 0, player: 'p1' });
  }

  end(early: boolean): this {
    this.#phase = 'ended';
    return this.add({ type: 'game-ended', early, happiness: 0, grade: 1 });
  }
}
