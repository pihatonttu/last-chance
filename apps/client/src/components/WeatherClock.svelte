<script lang="ts">
  import type { TimerView } from '@saari/protocol';
  import { t } from '../i18n/index.ts';
  import { clock } from '../lib/clock.svelte.ts';
  import { seconds } from '../lib/format.ts';
  import { temperatureText } from '../lib/heat.ts';
  import { ringDash } from '../lib/hud.ts';
  import { remainingMs } from '../state/reducer.ts';

  /**
   * The weather clock (docs/12-selkeys.md §2): the ring is the phase's time and empties as it
   * runs, with this month's temperature and the seconds inside. The size comes from the
   * parent as `--clock-size`, and the numbers inside scale with it.
   */
  interface Props {
    temperature: number;
    timer: TimerView;
    clockOffset: number;
    totalMs: number;
  }
  let { temperature, timer, clockOffset, totalMs }: Props = $props();

  const R = 19;
  const left = $derived(remainingMs(timer, clockOffset, clock.now));
  const share = $derived(totalMs > 0 ? left / totalMs : 0);
  const urgent = $derived(!timer.paused && left <= 10000);
  const now = $derived(temperatureText(temperature));
</script>

<div class="clock" class:urgent class:paused={timer.paused}>
  <svg viewBox="0 0 44 44" aria-hidden="true">
    <circle class="face" cx="22" cy="22" r="21.5" />
    <circle class="track" cx="22" cy="22" r={R} />
    <circle class="arc" cx="22" cy="22" r={R} stroke-dasharray={ringDash(share, R)} transform="rotate(-90 22 22)" />
  </svg>
  <span class="inside" aria-hidden="true">
    <span class="frost">{now}</span>
    <span class="secs">{timer.paused ? '❚❚' : t('common.seconds', { n: seconds(left) })}</span>
  </span>
  <span class="visually-hidden">{t('bar.temperature')}: {t('bar.temperatureValue', { now })}</span>
  {#if !timer.paused}
    <span class="visually-hidden">{t('bar.timeLeft', { s: seconds(left) })}</span>
  {/if}
</div>

<style>
  .clock {
    position: relative;
    width: var(--clock-size, 6em);
    height: var(--clock-size, 6em);
    border-radius: 50%;
    box-shadow: 0 3px 10px rgb(0 0 0 / 0.3);
  }
  svg {
    display: block;
    width: 100%;
    height: 100%;
  }
  .face {
    fill: #fff;
  }
  .track {
    fill: none;
    stroke: var(--primary-soft);
    stroke-width: 4.5;
  }
  .arc {
    fill: none;
    stroke: var(--primary);
    stroke-width: 4.5;
    stroke-linecap: round;
    transition: stroke-dasharray 250ms linear;
  }
  .inside {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  .frost {
    font-size: calc(var(--clock-size, 6em) * 0.26);
    font-weight: 900;
    color: var(--ink);
  }
  .secs {
    margin-top: 0.15em;
    font-size: calc(var(--clock-size, 6em) * 0.16);
    font-weight: 800;
    color: var(--primary-dark);
  }
  .urgent .arc {
    stroke: var(--danger);
  }
  .urgent .secs {
    color: var(--danger);
  }
  .paused .arc {
    stroke: var(--muted);
  }
  .paused .secs {
    color: var(--muted);
  }
  @media (prefers-reduced-motion: reduce) {
    .arc {
      transition: none;
    }
  }
</style>
