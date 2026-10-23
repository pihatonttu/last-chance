<script lang="ts">
  import type { GameView } from '@saari/protocol';
  import { formatNumber, t, tp } from '../i18n/index.ts';
  import { fireShort, givingUpSoon, hardFrost, temperatureText } from '../lib/heat.ts';
  import ArtIcon from './ArtIcon.svelte';
  import Icon from './Icon.svelte';
  import MoodFace from './MoodFace.svelte';
  import PhaseClock from './PhaseClock.svelte';

  /**
   * Laid out like the original game's HUD: the village's shared stock on the left (a
   * picture and a number each, words only for screen readers and tooltips), the clock in
   * the middle, the frost, the month and the village's mood on the right
   * (docs/10-arktinen.md §6). Wood reads "store / what the fire burns this month", and the
   * happiness shows the limit where the village gives up (§4b).
   */
  interface Props {
    game: GameView;
    clockOffset: number;
    phaseTotalMs: number;
    size?: 'projector' | 'student';
  }
  let { game, clockOffset, phaseTotalMs, size = 'student' }: Props = $props();

  const village = $derived(game.village);
  const short = $derived(village.resources.food < village.foodNeed);
  const cold = $derived(fireShort(village));
  const sheltered = $derived(village.shelterCapacity >= village.villagers);
  const mood = $derived(game.lastReport?.mood.total ?? 0);
  const icon = $derived(size === 'projector' ? 44 : 32);
  const small = $derived(size === 'projector' ? 30 : 22);
  const now = $derived(temperatureText(village.temperature));
  const next = $derived(village.forecast === null ? null : temperatureText(village.forecast));
  const hard = $derived(village.forecast !== null && hardFrost(village.forecast));
  const frostLabel = $derived(
    next === null
      ? t('bar.temperatureValue', { now })
      : `${t('bar.temperatureValue', { now })}, ${t('bar.forecastValue', { next })}`,
  );
  const monthValue = $derived(t('bar.monthValue', { month: game.month, total: game.totalMonths }));
  const losing = $derived(givingUpSoon(village.happiness, village.lossThreshold));
  const lossHint = $derived(t('bar.lossLimitHint', { n: village.lossThreshold }));
  /** The projector counts down to the party (docs/10-arktinen.md §1). */
  const monthsLeft = $derived(game.totalMonths - game.month);
</script>

<header class="hud {size}">
  <div class="resources" role="group" aria-label={t('bar.resources')}>
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
  <div class="clock">
    <PhaseClock phase={game.phase} timer={game.timer} {clockOffset} totalMs={phaseTotalMs} size={size === 'projector' ? 72 : 50} />
  </div>
  <div class="right">
    <div class="pill frost" title="{t('bar.temperature')}: {frostLabel}">
      <Icon name="thermometer" size={small} />
      <span class="visually-hidden">{t('bar.temperature')}: {frostLabel}</span>
      <span class="stack" aria-hidden="true">
        <span class="value">{now}</span>
        {#if next !== null}<span class="sub" class:hard>→ {next}</span>{/if}
      </span>
    </div>
    <div class="pill" title="{t('bar.month')} {monthValue}">
      <span class="calendar"><Icon name="calendar" size={small} /></span>
      <span class="visually-hidden">{t('bar.month')}</span>
      <span class="stack">
        <span class="value">{monthValue}</span>
        {#if size === 'projector'}
          <!-- The projector counts down to the party under the month. -->
          <span class="sub party">{monthsLeft > 0 ? tp('bar.untilParty', monthsLeft) : t('bar.partyThisMonth')}</span>
        {/if}
      </span>
    </div>
    <div class="pill" class:short={losing} title="{t('bar.happiness')} · {lossHint}">
      <MoodFace {mood} size={icon - 4} />
      <span class="visually-hidden">{t('bar.happiness')} {formatNumber(village.happiness)}. {lossHint}</span>
      <span class="stack" aria-hidden="true">
        <span class="value">{formatNumber(village.happiness)}</span>
        <span class="sub">{t('bar.lossLimit', { n: village.lossThreshold })}</span>
      </span>
    </div>
  </div>
</header>

<style>
  .hud {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 0.4rem 0.75rem;
    padding: 0.35rem 0.6rem;
    background: var(--card);
    border-bottom: 3px solid var(--line);
  }
  .resources {
    justify-self: start;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem;
    padding: 0.2rem 0.35rem;
    border-radius: 999px;
    background: var(--card-2);
    border: 2px solid var(--line);
  }
  .cell {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.1rem 0.55rem 0.1rem 0.25rem;
    border-radius: 999px;
    min-height: 40px;
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
  .short {
    background: var(--danger-soft);
  }
  .short .value,
  .short .of,
  .short .sub {
    color: var(--danger);
  }
  .clock {
    justify-self: center;
  }
  .right {
    justify-self: end;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    min-height: 40px;
    padding: 0.15rem 0.7rem 0.15rem 0.4rem;
    border-radius: 999px;
    background: var(--card-2);
    border: 2px solid var(--line);
  }
  .pill.short {
    background: var(--danger-soft);
    border-color: #efa49d;
  }
  .calendar {
    display: inline-flex;
  }
  /* A small second line under the number: the forecast, or the limit where the village gives up. */
  .stack {
    display: inline-flex;
    flex-direction: column;
    align-items: flex-start;
    line-height: 1.05;
  }
  .sub {
    font-size: 0.72em;
    font-weight: 800;
    color: var(--muted);
    white-space: nowrap;
  }
  .sub.hard {
    color: #1f5f8f;
  }
  .frost {
    background: #eaf4fb;
    border-color: #9cc3dc;
  }
  @media (max-width: 760px) {
    .hud {
      grid-template-columns: 1fr auto;
    }
    .resources {
      grid-column: 1 / -1;
      justify-self: stretch;
      justify-content: space-between;
      flex-wrap: nowrap;
      gap: 0;
    }
    .cell {
      gap: 0.15rem;
      padding: 0 0.3rem 0 0.1rem;
    }
    .cell :global(.art-icon) {
      width: 26px;
      height: 26px;
    }
    .value {
      font-size: 1em;
    }
    .clock {
      justify-self: start;
    }
    .right {
      gap: 0.25rem;
    }
    .pill {
      gap: 0.2rem;
      padding: 0.1rem 0.45rem 0.1rem 0.3rem;
    }
  }
  /* Phones: the clock, the frost, the month and the mood share one row, so everything tightens. */
  @media (max-width: 420px) {
    .hud {
      gap: 0.35rem 0.3rem;
      padding: 0.3rem 0.4rem;
    }
    .calendar {
      display: none;
    }
    .right {
      gap: 0.15rem;
    }
    .pill {
      gap: 0.1rem;
      padding: 0.1rem 0.35rem 0.1rem 0.2rem;
    }
    .frost :global(.icon) {
      margin: 0 -0.2rem;
    }
    .pill :global(svg[role='img']) {
      width: 24px;
      height: 24px;
    }
    .clock :global(.phase) {
      font-size: 0.85em;
    }
  }
  /* The narrowest phones keep the dial and read the phase name out only (the popups show the phase anyway). */
  @media (max-width: 370px) {
    .clock :global(.phase) {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }
  }
  .student {
    font-size: 15px;
  }
  .projector {
    font-size: clamp(18px, 1.45vw, 30px);
    gap: 0.5rem 1rem;
    padding: 0.5rem 1rem;
  }
  .projector .cell {
    padding-right: 0.8rem;
    min-height: 56px;
  }
  .party {
    color: var(--primary-dark);
  }
</style>
