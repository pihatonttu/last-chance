<script lang="ts">
  import type { Phase } from '@saari/rules';
  import type { TimerView } from '@saari/protocol';
  import { t } from '../i18n/index.ts';
  import { clock } from '../lib/clock.svelte.ts';
  import { seconds } from '../lib/format.ts';
  import { remainingMs } from '../state/reducer.ts';

  interface Props {
    phase: Phase;
    timer: TimerView;
    clockOffset: number;
    totalMs: number;
  }
  let { phase, timer, clockOffset, totalMs }: Props = $props();

  const left = $derived(remainingMs(timer, clockOffset, clock.now));
  const share = $derived(totalMs > 0 ? Math.min(1, left / totalMs) : 0);
  const running = $derived(phase === 'action' || phase === 'vote' || phase === 'summary');
  const urgent = $derived(running && !timer.paused && left <= 10000);
</script>

<div class="timer" class:urgent class:paused={timer.paused}>
  <div class="row">
    <span class="phase">{t(`phase.${phase}`)}</span>
    {#if timer.paused}
      <span class="badge">{t('host.paused')}</span>
    {:else if running}
      <span class="seconds" aria-label={t('bar.timeLeft', { s: seconds(left) })}>
        {t('common.seconds', { n: seconds(left) })}
      </span>
    {/if}
  </div>
  {#if running}
    <div class="bar" aria-hidden="true"><span style:width="{share * 100}%"></span></div>
  {/if}
</div>

<style>
  .timer {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 9.5em;
  }
  .row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.75rem;
  }
  .phase {
    font-weight: 800;
  }
  .seconds {
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    font-size: 1.15em;
  }
  .badge {
    padding: 0 0.5em;
    border-radius: 999px;
    background: var(--warn-soft);
    color: var(--warn);
    font-weight: 800;
  }
  .bar > span {
    transition: width 250ms linear;
  }
  .urgent .seconds {
    color: var(--danger);
  }
  .urgent .bar > span {
    background: var(--danger);
  }
  .paused .bar > span {
    background: var(--muted);
  }
</style>
