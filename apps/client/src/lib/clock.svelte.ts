/** A reactive "now" for countdowns. Ticks four times a second while the page is open. */
class Clock {
  now = $state(Date.now());

  constructor() {
    if (typeof setInterval !== 'undefined') setInterval(() => (this.now = Date.now()), 250);
  }
}

export const clock = new Clock();
