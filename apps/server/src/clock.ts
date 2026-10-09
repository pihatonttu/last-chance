/** Opaque timer handle. */
export type TimerHandle = object;

/** Time source and timers; injected so tests can run whole games without real time. */
export interface Scheduler {
  now(): number;
  setTimeout(callback: () => void, ms: number): TimerHandle;
  clearTimeout(handle: TimerHandle): void;
}

export const realScheduler: Scheduler = {
  now: () => Date.now(),
  setTimeout: (callback, ms) => setTimeout(callback, Math.max(0, ms)),
  clearTimeout: (handle) => clearTimeout(handle as NodeJS.Timeout),
};
