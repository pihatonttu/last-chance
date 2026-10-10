<script lang="ts">
  import type { MonthReport } from '@saari/rules';
  import { formatNumber, t, tp } from '../i18n/index.ts';
  import { optionName } from '../lib/format.ts';
  import { parseOptionId } from '../lib/rules-info.ts';
  import ArtIcon from './ArtIcon.svelte';
  import MoodFace from './MoodFace.svelte';
  import PropPicture from './PropPicture.svelte';

  /**
   * The end of a month in four pictures: what was built, whether everyone ate, whether
   * everyone had shelter, and how the mood changed. The numbers behind them wait under
   * "More info" (P38).
   */
  let { report }: { report: MonthReport } = $props();

  const built = $derived(report.vote.outcome === 'built' ? parseOptionId(report.vote.option ?? '') : null);
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
  const fed = $derived(report.food.hungry === 0);
  const sheltered = $derived(report.shelter.unsheltered === 0);

  function signed(n: number): string {
    return n > 0 ? `+${formatNumber(n)}` : formatNumber(n);
  }
</script>

<section class="summary" aria-labelledby="summary-title">
  <h2 id="summary-title">{t('summary.title', { month: report.month })}</h2>

  <div class="tiles">
    <div class="tile" class:good={built !== null} class:bad={report.vote.outcome === 'tie'}>
      <PropPicture texture={built ? `props/${built.kind}-${built.level}` : null} size={84} />
      <strong>{voteLine}</strong>
    </div>
    <div class="tile" class:good={fed} class:bad={!fed}>
      <span class="visually-hidden">{t('summary.food')}</span>
      <span class="icon"><ArtIcon name="food" size={64} /><span class="mark" aria-hidden="true">{fed ? '✓' : '✗'}</span></span>
      <strong>{fed ? t('summary.food.allFed') : tp('summary.food.hungry', report.food.hungry)}</strong>
    </div>
    <div class="tile" class:good={sheltered} class:bad={!sheltered}>
      <span class="visually-hidden">{t('summary.shelter')}</span>
      <span class="icon"><ArtIcon name="shelter" size={64} /><span class="mark" aria-hidden="true">{sheltered ? '✓' : '✗'}</span></span>
      <strong>{sheltered ? t('summary.shelter.all') : tp('summary.shelter.without', report.shelter.unsheltered)}</strong>
    </div>
    <div class="tile" class:good={report.mood.total > 0} class:bad={report.mood.total < 0}>
      <MoodFace mood={report.mood.total} size={64} />
      <strong><span class="delta">{signed(report.mood.total)}</span> {t('summary.mood')}</strong>
      <span class="visually-hidden">{t('summary.mood.total')}</span>
    </div>
  </div>

  <details class="more">
    <summary>{t('tile.more')}</summary>
    <ul>
      <li>{t('summary.food.eaten', { eaten: report.food.eaten, need: report.food.need })}</li>
      {#if report.food.spoiled > 0}<li class="warn">{t('summary.food.spoiled', { n: report.food.spoiled })}</li>{/if}
      <li>{t('summary.food.left', { n: report.food.after })}</li>
      <li>{t('summary.shelter.value', { capacity: report.shelter.capacity, villagers: report.villagers })}</li>
      <li>{t('summary.mood.food')}: {signed(report.mood.food)}</li>
      <li>{t('summary.mood.shelter')}: {signed(report.mood.shelter)}</li>
      <li>{t('summary.mood.recreation', { n: report.recreation })}: {signed(report.mood.recreation)}</li>
      <li><strong>{t('summary.happiness')}: {formatNumber(report.happiness)}</strong></li>
      {#if report.vote.outcome === 'tie'}<li>{t('summary.tieHint')}</li>{/if}
    </ul>
  </details>
  <p class="next">{t('summary.next')}</p>
</section>

<style>
  .summary h2 {
    margin: 0 0 0.6em;
    font-size: 1.6em;
    text-align: center;
  }
  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9.5em, 1fr));
    gap: 0.7em;
  }
  .tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.4em;
    padding: 0.8em 0.6em;
    border-radius: var(--radius);
    background: var(--card-2);
    border: 3px solid var(--line);
    text-align: center;
  }
  .tile strong {
    font-size: 1.1em;
    line-height: 1.2;
  }
  .good {
    background: var(--ok-soft);
    border-color: #9bd3a0;
  }
  .bad {
    background: var(--danger-soft);
    border-color: #efa49d;
  }
  .icon {
    position: relative;
    display: inline-grid;
  }
  .mark {
    position: absolute;
    right: -0.5em;
    bottom: -0.3em;
    display: grid;
    place-items: center;
    width: 1.6em;
    height: 1.6em;
    border-radius: 50%;
    color: #fff;
    font-weight: 900;
    background: var(--ok);
    box-shadow: var(--shadow);
  }
  .bad .mark {
    background: var(--danger);
  }
  .delta {
    font-size: 1.4em;
    font-weight: 900;
  }
  .good .delta {
    color: var(--ok);
  }
  .bad .delta {
    color: var(--danger);
  }
  .more {
    margin-top: 0.8em;
  }
  .more summary {
    font-weight: 800;
    color: var(--primary-dark);
    cursor: pointer;
    min-height: 40px;
    display: flex;
    align-items: center;
  }
  .more ul {
    margin: 0.3em 0 0;
    padding-left: 1.2em;
  }
  .warn {
    color: var(--warn);
    font-weight: 700;
  }
  .next {
    margin: 0.8em 0 0;
    text-align: center;
    color: var(--muted);
    font-weight: 700;
  }
</style>
