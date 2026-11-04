<script lang="ts">
  import type { GameView } from '@saari/protocol';
  import { formatNumber, t, tp } from '../i18n/index.ts';
  import { fireShort, forecastLook, givingUpSoon, temperatureText, type ForecastLook } from '../lib/heat.ts';
  import { phaseHeading } from '../lib/hud.ts';
  import ArtIcon from './ArtIcon.svelte';
  import MoodFace from './MoodFace.svelte';
  import WeatherClock from './WeatherClock.svelte';

  /**
   * The top of the game (docs/12-selkeys.md §2). In the bar: the phase in big words, the
   * weather clock and next month's forecast. Under the bar, over the corners of the map: the
   * village's shared stock (a picture and a number each, words for screen readers and
   * tooltips) and the month with the happiness. Wood reads "store/what the fire burns this
   * month", and the happiness shows the limit where the village gives up. The colour of the
   * forecast only repeats what its words say.
   */
  interface Props {
    game: GameView;
    clockOffset: number;
    phaseTotalMs: number;
    size?: 'projector' | 'student';
    /** How far the corners reach down over the map, in pixels; they wrap on narrower screens. */
    underHud?: number;
  }
  let { game, clockOffset, phaseTotalMs, size = 'student', underHud = $bindable(0) }: Props = $props();

  const HINTS: Record<ForecastLook, string> = {
    hard: t('bar.hint.hard'),
    cold: t('bar.hint.cold'),
    mild: t('bar.hint.mild'),
    party: t('bar.partyThisMonth'),
  };

  const village = $derived(game.village);
  const heading = $derived(phaseHeading(game.phase, game.timer.paused));
  const short = $derived(village.resources.food < village.foodNeed);
  const cold = $derived(fireShort(village));
  const sheltered = $derived(village.shelterCapacity >= village.villagers);
  const mood = $derived(game.lastReport?.mood.total ?? 0);
  const icon = $derived(size === 'projector' ? 44 : 32);
  const look = $derived(forecastLook(village.forecast));
  const monthValue = $derived(t('bar.monthValue', { month: game.month, total: game.totalMonths }));
  const losing = $derived(givingUpSoon(village.happiness, village.lossThreshold));
  const lossHint = $derived(t('bar.lossLimitHint', { n: village.lossThreshold }));
  /** The projector counts down to the party (docs/10-arktinen.md §1). */
  const monthsLeft = $derived(game.totalMonths - game.month);
</script>

<header class="hud {size}">
  <div class="strip">
    <div class="heading" aria-live="polite">
      {#key heading.title}
        <h1 class="title">{heading.title}</h1>
      {/key}
      {#if heading.subtitle !== null}<p class="subtitle">{heading.subtitle}</p>{/if}
    </div>
    <div class="clock">
      <WeatherClock temperature={village.temperature} timer={game.timer} {clockOffset} totalMs={phaseTotalMs} />
    </div>
    <div class="forecast {look}">
      {#if village.forecast !== null}
        <span class="next">{t('bar.nextMonth')} <b>{temperatureText(village.forecast)}</b></span>
      {/if}
      <span class="hint">{HINTS[look]}</span>
    </div>
  </div>
  <div class="corners" bind:clientHeight={underHud}>
    <div class="pill resources" role="group" aria-label={t('bar.resources')}>
      <div class="cell" class:short={cold} title="{t('bar.wood')} · {t('bar.fireNeed', { need: village.heatNeed })}">
        <ArtIcon name="wood" size={icon} />
        <span class="visually-hidden">{t('bar.wood')}: {t('bar.woodValue', { wood: village.resources.wood, need: village.heatNeed })}</span>
        <span class="value" aria-hidden="true">{formatNumber(village.resources.wood)}<span class="of">/{formatNumber(village.heatNeed)}</span></span>
      </div>
      <div class="cell" title={t('bar.stone')}>
        <ArtIcon name="stone" size={icon} />
        <span class="visually-hidden">{t('bar.stone')}</span>
        <span class="value">{formatNumber(village.resources.stone)}</span>
      </div>
      <div class="cell" class:short title="{t('bar.food')} · {t('bar.storage', { max: village.foodStorage })}">
        <ArtIcon name="food" size={icon} />
        <span class="visually-hidden">{t('bar.food')}: {t('bar.foodValue', { food: village.resources.food, need: village.foodNeed })}</span>
        <span class="value" aria-hidden="true">{formatNumber(village.resources.food)}<span class="of">/{formatNumber(village.foodNeed)}</span></span>
      </div>
      <div class="cell" class:short={!sheltered} title={t('bar.shelter')}>
        <ArtIcon name="home" size={icon} />
        <span class="visually-hidden">{t('bar.shelter')}</span>
        <span class="value">{t('bar.shelterValue', { capacity: village.shelterCapacity, villagers: village.villagers })}</span>
      </div>
    </div>
    <div class="pill status">
      <div class="cell">
        <span class="stack">
          <span class="value">{t('bar.month')} {monthValue}</span>
          {#if size === 'projector' && monthsLeft > 0}
            <!-- The projector counts down to the party under the month. -->
            <span class="sub until">{tp('bar.untilParty', monthsLeft)}</span>
          {/if}
        </span>
      </div>
      <div class="cell mood" class:short={losing} title="{t('bar.happiness')} · {lossHint}">
        <MoodFace {mood} size={icon - 4} />
        <span class="visually-hidden">{t('bar.happiness')} {formatNumber(village.happiness)}. {lossHint}</span>
        <span class="stack" aria-hidden="true">
          <span class="value"><span class="word">{t('bar.happiness')}</span> {formatNumber(village.happiness)}</span>
          <span class="sub">{t('bar.lossLimit', { n: village.lossThreshold })}</span>
        </span>
      </div>
    </div>
  </div>
</header>

<style>
  .hud {
    --clock-size: 7.4em;
    position: relative;
    /* The clock and the corners lie over the map. */
    z-index: 2;
    background: var(--card);
    border-bottom: 3px solid var(--line);
  }
  .student {
    font-size: 15px;
  }
  .projector {
    font-size: clamp(18px, 1.45vw, 30px);
  }

  .strip {
    display: grid;
    grid-template-columns: minmax(0, 1fr) var(--clock-size) minmax(0, 1fr);
    align-items: center;
    gap: 0.75em;
    min-height: 5.4em;
    padding: 0.4em 0.75em;
  }
  .heading {
    min-width: 0;
  }
  .title {
    margin: 0;
    font-size: min(2.4em, 4vw);
    font-weight: 900;
    line-height: 1;
    letter-spacing: 0.01em;
    transform-origin: left center;
    animation: pop 350ms ease-out;
  }
  .subtitle {
    margin: 0.3em 0 0;
    font-weight: 800;
    line-height: 1.15;
    color: var(--primary-dark);
  }
  @keyframes pop {
    from {
      transform: scale(0.8);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .title {
      animation: none;
    }
  }

  /* Hangs from the top of the bar over the map, like in the approved picture. */
  .clock {
    position: absolute;
    top: 0.4em;
    left: 50%;
    transform: translateX(-50%);
  }

  .forecast {
    grid-column: 3;
    justify-self: end;
    display: flex;
    flex-direction: column;
    max-width: 100%;
    padding: 0.2em 0.8em 0.35em;
    border: 2px solid;
    border-radius: var(--radius-small);
    font-weight: 800;
    line-height: 1.2;
  }
  .next b {
    font-size: 1.6em;
    font-weight: 900;
    font-variant-numeric: tabular-nums;
  }
  .hard {
    background: var(--danger-soft);
    border-color: var(--danger);
  }
  .hard b {
    color: var(--danger);
  }
  .cold {
    background: var(--warn-soft);
    border-color: var(--warn);
  }
  .cold b {
    color: var(--warn);
  }
  .mild {
    background: var(--ok-soft);
    border-color: var(--ok);
  }
  .mild b {
    /* Darker than --ok, which reaches only 4.42:1 on --ok-soft. */
    color: #28692c;
  }
  .party {
    background: var(--primary-soft);
    border-color: var(--primary);
    padding-block: 0.5em;
  }
  .party .hint {
    font-size: 1.15em;
    font-weight: 900;
    color: var(--primary-dark);
  }

  .corners {
    position: absolute;
    top: 100%;
    inset-inline: 0;
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.35em 0.75em;
    padding: 0.5em 0.6em;
    pointer-events: none;
  }
  .pill {
    display: flex;
    align-items: center;
    gap: 0.25em;
    padding: 0.15em 0.4em;
    border-radius: 999px;
    background: var(--card);
    box-shadow: 0 2px 8px rgb(0 0 0 / 0.3);
    pointer-events: auto;
  }
  .status {
    margin-left: auto;
  }
  .cell {
    display: inline-flex;
    align-items: center;
    gap: 0.3em;
    min-height: 2.5em;
    padding: 0.1em 0.5em 0.1em 0.2em;
    border-radius: 999px;
  }
  .status .cell {
    padding-inline: 0.5em;
  }
  .value {
    font-weight: 900;
    font-size: 1.15em;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .of {
    font-size: 0.75em;
    font-weight: 800;
    color: var(--muted);
  }
  .word {
    font-size: 0.85em;
  }
  /* A small second line: the countdown to the party, or the limit where the village gives up. */
  .stack {
    display: inline-flex;
    flex-direction: column;
    align-items: flex-start;
    line-height: 1.05;
  }
  .sub {
    font-size: 0.8em;
    font-weight: 800;
    color: var(--muted);
    white-space: nowrap;
  }
  .until {
    color: var(--primary-dark);
  }
  .short {
    background: var(--danger-soft);
  }
  .short .value,
  .short .of,
  .short .sub {
    color: var(--danger);
  }

  /* Narrower screens: the clock stays inside the bar, so the corners can use the whole width. */
  @media (max-width: 1100px) {
    .hud {
      --clock-size: 5.4em;
    }
    .strip {
      min-height: calc(var(--clock-size) + 0.8em);
    }
  }

  /*
   * Phones keep everything in a tighter form: the title and the forecast share the left side
   * with the clock on the right, the stock takes a row of its own and the month with the
   * happiness the next one.
   */
  @media (max-width: 640px) {
    .strip {
      grid-template-columns: minmax(0, 1fr) auto;
      grid-template-areas:
        'heading clock'
        'forecast clock';
      gap: 0.25em 0.5em;
      min-height: 0;
      padding: 0.35em 0.5em;
    }
    .heading {
      grid-area: heading;
    }
    .title {
      font-size: min(1.6em, 6.4vw);
    }
    .subtitle {
      margin-top: 0.15em;
      font-size: 0.87em;
    }
    .clock {
      grid-area: clock;
      position: static;
      transform: none;
    }
    .forecast {
      grid-area: forecast;
      justify-self: stretch;
      padding: 0.05em 0.5em 0.2em;
      font-size: 0.87em;
    }
    .next b {
      font-size: 1.3em;
    }
    .party {
      padding-block: 0.25em;
    }
    .party .hint {
      font-size: 1em;
    }
    .corners {
      gap: 0.25em;
      padding: 0.3em 0.4em;
    }
    .resources {
      width: 100%;
      justify-content: space-between;
      gap: 0;
      padding: 0.1em 0.3em;
    }
    .status {
      gap: 0;
      padding: 0 0.2em;
    }
    .cell {
      gap: 0.15em;
      min-height: 2.2em;
      padding: 0 0.3em 0 0.1em;
    }
    .cell :global(.art-icon) {
      width: 26px;
      height: 26px;
    }
    .value {
      font-size: 1em;
    }
    .mood :global(svg[role='img']) {
      width: 24px;
      height: 24px;
    }
    .mood .stack {
      flex-direction: row;
      align-items: baseline;
      gap: 0.35em;
    }
  }
  /* Only here the width runs out; the screen reader text and the tooltip still say the word. */
  @media (max-width: 359px) {
    .word {
      display: none;
    }
  }
</style>
