<script lang="ts">
  import type { MonthReport } from '@saari/rules';
  import { formatNumber, t, tp } from '../i18n/index.ts';
  import { optionName } from '../lib/format.ts';
  import MoodFace from './MoodFace.svelte';

  let { report }: { report: MonthReport } = $props();

  const voteLine = $derived.by(() => {
    switch (report.vote.outcome) {
      case 'built':
        return t('summary.built', { name: optionName({ id: report.vote.option ?? 'none' }) });
      case 'tie':
        return t('summary.tie');
      case 'none':
        return t('summary.none');
      case 'no-votes':
        return t('summary.noVotes');
    }
  });

  function signed(n: number): string {
    return n > 0 ? `+${formatNumber(n)}` : formatNumber(n);
  }
</script>

<section class="summary" aria-labelledby="summary-title">
  <h2 id="summary-title">{t('summary.title', { month: report.month })}</h2>
  <p class="vote-line" class:tie={report.vote.outcome === 'tie'}>{voteLine}</p>

  <div class="grid">
    <div class="box" class:bad={report.food.hungry > 0}>
      <h3>{t('summary.food')}</h3>
      <p>{t('summary.food.eaten', { eaten: report.food.eaten, need: report.food.need })}</p>
      <p class="status">
        {report.food.hungry > 0 ? tp('summary.food.hungry', report.food.hungry) : t('summary.food.allFed')}
      </p>
      {#if report.food.spoiled > 0}
        <p class="warn">{t('summary.food.spoiled', { n: report.food.spoiled })}</p>
      {/if}
      <p class="muted">{t('summary.food.left', { n: report.food.after })}</p>
    </div>

    <div class="box" class:bad={report.shelter.unsheltered > 0}>
      <h3>{t('summary.shelter')}</h3>
      <p>{t('summary.shelter.value', { capacity: report.shelter.capacity, villagers: report.villagers })}</p>
      <p class="status">
        {report.shelter.unsheltered > 0 ? tp('summary.shelter.without', report.shelter.unsheltered) : t('summary.shelter.all')}
      </p>
    </div>

    <div class="box mood">
      <h3>{t('summary.mood')}</h3>
      <table>
        <tbody>
          <tr><th scope="row">{t('summary.mood.food')}</th><td>{signed(report.mood.food)}</td></tr>
          <tr><th scope="row">{t('summary.mood.shelter')}</th><td>{signed(report.mood.shelter)}</td></tr>
          <tr>
            <th scope="row">{t('summary.mood.recreation', { n: report.recreation })}</th>
            <td>{signed(report.mood.recreation)}</td>
          </tr>
          <tr class="total"><th scope="row">{t('summary.mood.total')}</th><td>{signed(report.mood.total)}</td></tr>
        </tbody>
      </table>
    </div>

    <div class="box happiness">
      <MoodFace mood={report.mood.total} size={56} />
      <div>
        <h3>{t('summary.happiness')}</h3>
        <p class="big">{formatNumber(report.happiness)}</p>
      </div>
    </div>
  </div>
  <p class="muted next">{t('summary.next')}</p>
</section>

<style>
  .summary h2 {
    margin: 0;
    font-size: 1.6em;
  }
  .vote-line {
    font-size: 1.15em;
    font-weight: 800;
    margin: 0.3em 0 0.8em;
    color: var(--ok);
  }
  .vote-line.tie {
    color: var(--danger);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(13em, 1fr));
    gap: 0.75em;
  }
  .box {
    padding: 0.75em 1em;
    border-radius: var(--radius-small);
    background: var(--ok-soft);
  }
  .box.bad {
    background: var(--danger-soft);
  }
  .box.mood {
    background: var(--card-2);
  }
  .box.happiness {
    display: flex;
    align-items: center;
    gap: 0.75em;
    background: var(--primary-soft);
  }
  h3 {
    margin: 0 0 0.3em;
    font-size: 1em;
  }
  p {
    margin: 0.15em 0;
  }
  .status {
    font-weight: 800;
  }
  .warn {
    color: var(--warn);
    font-weight: 700;
  }
  .big {
    font-size: 2em;
    font-weight: 900;
    line-height: 1;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th {
    text-align: left;
    font-weight: 600;
  }
  td {
    text-align: right;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
  .total th,
  .total td {
    border-top: 2px solid var(--line);
    font-weight: 900;
    padding-top: 0.2em;
  }
  .next {
    margin-top: 0.75em;
  }
</style>
