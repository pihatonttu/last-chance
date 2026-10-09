import type { Scheduler, TimerHandle } from '../src/clock.ts';

interface Pending {
  id: number;
  at: number;
  callback: () => void;
}

/** Manual clock: timers fire in time order (then creation order) during advance(). */
export class FakeScheduler implements Scheduler {
  #now: number;
  #seq = 0;
  #timers = new Map<number, Pending>();

  constructor(start = 1_700_000_000_000) {
    this.#now = start;
  }

  now(): number {
    return this.#now;
  }

  setTimeout(callback: () => void, ms: number): TimerHandle {
    const id = ++this.#seq;
    this.#timers.set(id, { id, at: this.#now + Math.max(0, ms), callback });
    return { id };
  }

  clearTimeout(handle: TimerHandle): void {
    this.#timers.delete((handle as { id: number }).id);
  }

  get pending(): number {
    return this.#timers.size;
  }

  /** Moves time forward by `ms`, firing every timer that falls due on the way. */
  advance(ms: number): void {
    const target = this.#now + ms;
    for (;;) {
      let next: Pending | undefined;
      for (const t of this.#timers.values()) {
        if (t.at <= target && (!next || t.at < next.at || (t.at === next.at && t.id < next.id))) next = t;
      }
      if (!next) break;
      this.#timers.delete(next.id);
      this.#now = Math.max(this.#now, next.at);
      next.callback();
    }
    this.#now = target;
  }

  /** Advances in steps until `done()` or `maxMs` has passed; returns whether done. */
  runUntil(done: () => boolean, maxMs: number, stepMs = 250): boolean {
    let elapsed = 0;
    while (!done() && elapsed < maxMs) {
      this.advance(stepMs);
      elapsed += stepMs;
    }
    return done();
  }
}
