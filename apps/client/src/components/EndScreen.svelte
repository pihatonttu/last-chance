<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { GameResult } from '@saari/protocol';
  import { formatNumber, t } from '../i18n/index.ts';
  import { GRADES } from '../lib/enums.ts';
  import { gradeName } from '../lib/format.ts';

  let { result, children }: { result: GameResult; children?: Snippet } = $props();

  const ladder = [...GRADES].reverse();
</script>

<section class="end" aria-labelledby="end-title">
  <p class="kicker">{result.early ? t('end.early') : t('end.arrived')}</p>
  <h1 id="end-title">{gradeName(result.grade)}</h1>
  <p class="meta">
    <span>{t('end.grade', { grade: result.grade })}</span>
    <span>{t('end.happiness', { n: formatNumber(result.happiness) })}</span>
  </p>
  <ol class="ladder" aria-hidden="true">
    {#each ladder as grade (grade)}
      <li class:reached={grade === result.grade} class:below={grade < result.grade}>
        <span class="step">{grade}</span>
        <span>{gradeName(grade)}</span>
      </li>
    {/each}
  </ol>
  <p class="thanks">{t('end.thanks')}</p>
  {#if children}
    <div class="actions no-print">{@render children()}</div>
  {/if}
</section>

<style>
  .end {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5em;
  }
  .kicker {
    margin: 0;
    font-weight: 800;
    color: var(--primary-dark);
    font-size: 1.2em;
  }
  h1 {
    margin: 0;
    font-size: 2.6em;
    color: var(--ink);
  }
  .meta {
    display: flex;
    gap: 1.25em;
    margin: 0;
    font-weight: 800;
    font-size: 1.15em;
  }
  .ladder {
    list-style: none;
    margin: 0.5em 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.3em;
    min-width: min(22em, 100%);
  }
  .ladder li {
    display: flex;
    align-items: center;
    gap: 0.6em;
    padding: 0.25em 0.6em;
    border-radius: 999px;
    color: var(--muted);
    font-weight: 700;
    text-align: left;
  }
  .ladder .step {
    display: inline-grid;
    place-items: center;
    width: 1.8em;
    height: 1.8em;
    border-radius: 50%;
    background: var(--card-2);
    border: 2px solid var(--line);
    font-weight: 900;
  }
  .ladder .below .step {
    background: var(--ok-soft);
  }
  .ladder .reached {
    background: var(--gold);
    color: var(--ink);
    font-weight: 900;
    transform: scale(1.06);
  }
  .ladder .reached .step {
    background: #fff;
    border-color: var(--ink);
  }
  .thanks {
    max-width: 34em;
    margin: 0.25em 0;
  }
  .actions {
    display: flex;
    gap: 0.75em;
    flex-wrap: wrap;
    justify-content: center;
  }
</style>
