<script lang="ts">
  import type { Phase } from '@saari/rules';
  import type { TimerView } from '@saari/protocol';
  import { t } from '../i18n/index.ts';
  import { clock } from '../lib/clock.svelte.ts';
  import { seconds } from '../lib/format.ts';
  import { ringDash } from '../lib/hud.ts';
  import { remainingMs } from '../state/reducer.ts';

  /** The phase's time as a ring that empties, with the seconds inside (the original game's day clock). */
  interface Props {
    phase: Phase;
    timer: TimerView;
    clockOffset: number;
    totalMs: number;
    size?: number;
  }
  let { phase, timer, clockOffset, totalMs, size = 52 }: Props = $props();

  const R = 19;
  const left = $derived(remainingMs(timer, clockOffset, clock.now));
  const share = $derived(totalMs > 0 ? left / totalMs : 0);
  const running = $derived(phase === 'action' || phase === 'vote' || phase === 'summary');
  const urgent = $derived(running && !timer.paused && left <= 10000);
</script>

<div class="clock" class:urgent class:paused={timer.paused} class:running>
  <div class="dial" style:width="{size}px" style:height="{size}px">
    <svg viewBox="0 0 44 44" width={size} height={size} aria-hidden="true">
      <circle class="face" cx="22" cy="22" r="21" />
      <circle class="track" cx="22" cy="22" r={R} />
      {#if running}
        <circle class="arc" cx="22" cy="22" r={R} stroke-dasharray={ringDash(share, R)} transform="rotate(-90 22 22)" />
      {/if}
    </svg>
    {#if timer.paused}
      <span class="inside pause" aria-hidden="true">❚❚</span>
    {:else if running}
      <span class="inside secs" aria-hidden="true">{seconds(left)}</span>
    {/if}
  </div>
  <div class="text">
    <span class="phase">{t(`phase.${phase}`)}</span>
    {#if timer.paused}
      <span class="badge">{t('host.paused')}</span>
    {:else if running}
      <span class="visually-hidden">{t('bar.timeLeft', { s: seconds(left) })}</span>
    {/if}
  </div>
</div>

<style>
  .clock {
    display: flex;
    align-items: center;
    gap: 0.5em;
  }
  .dial {
    position: relative;
    flex: none;
  }
  .dial svg {
    display: block;
  }
  .face {
    fill: #fff;
    stroke: var(--line);
    stroke-width: 1.5;
  }
  .track {
    fill: none;
    stroke: var(--primary-soft);
    stroke-width: 5;
  }
  .arc {
    fill: none;
    stroke: var(--primary);
    stroke-width: 5;
    stroke-linecap: round;
    transition: stroke-dasharray 250ms linear;
  }
  .inside {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-weight: 900;
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }
  .secs {
    font-size: 1.05em;
  }
  .pause {
    font-size: 0.8em;
    color: var(--muted);
  }
  .text {
    display: flex;
    flex-direction: column;
    line-height: 1.15;
  }
  .phase {
    font-weight: 800;
  }
  .badge {
    font-size: 0.8em;
    font-weight: 800;
    color: var(--warn);
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
</style>
