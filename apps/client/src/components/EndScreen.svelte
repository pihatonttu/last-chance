<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { GameResult } from '@saari/protocol';
  import { formatNumber, t } from '../i18n/index.ts';
  import { GRADES } from '../lib/enums.ts';
  import { gradeName } from '../lib/format.ts';
  import ArtIcon from './ArtIcon.svelte';

  /**
   * The result as a picture: the rescue ship, the village's level as stars and its name.
   * The whole ladder of levels waits behind "More info".
   */
  let { result, children }: { result: GameResult; children?: Snippet } = $props();

  const ladder = [...GRADES].reverse();
  const top = GRADES.length;
</script>

<section class="end" aria-labelledby="end-title">
  {#if !result.early}<span class="ship"><ArtIcon name="ship" size={150} /></span>{/if}
  <p class="kicker">{result.early ? t('end.early') : t('end.arrived')}</p>
  <p class="stars" aria-label={t('end.grade', { grade: result.grade })}>
    {#each Array.from({ length: top }, (_, i) => i + 1) as star (star)}
      <span class:on={star <= result.grade} aria-hidden="true">★</span>
    {/each}
  </p>
  <h1 id="end-title">{gradeName(result.grade)}</h1>
  <p class="meta">{t('end.happiness', { n: formatNumber(result.happiness) })}</p>
  <details class="more">
    <summary>{t('end.levels')}</summary>
    <ol class="ladder">
      {#each ladder as grade (grade)}
        <li class:reached={grade === result.grade}>
          <span class="mini" aria-hidden="true">{'★'.repeat(grade)}</span>
          <span>{gradeName(grade)}</span>
        </li>
      {/each}
    </ol>
  </details>
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
    gap: 0.4em;
  }
  .ship {
    animation: bob 3s ease-in-out infinite;
  }
  .ship :global(img) {
    width: 7.5em;
    height: 7.5em;
  }
  @keyframes bob {
    50% {
      transform: translateY(-6px) rotate(-1.5deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .ship {
      animation: none;
    }
  }
  .kicker {
    margin: 0;
    font-weight: 800;
    color: var(--primary-dark);
    font-size: 1.3em;
  }
  .stars {
    margin: 0;
    font-size: 2.6em;
    letter-spacing: 0.08em;
    line-height: 1;
    color: #d5dbe0;
  }
  .stars .on {
    color: var(--gold);
    text-shadow: 0 2px 0 rgb(0 0 0 / 0.12);
  }
  h1 {
    margin: 0;
    font-size: 2.4em;
    color: var(--ink);
  }
  .meta {
    margin: 0;
    font-weight: 800;
    color: var(--muted);
  }
  .more summary {
    font-weight: 800;
    color: var(--primary-dark);
    cursor: pointer;
    min-height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .ladder {
    list-style: none;
    margin: 0.3em 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25em;
    min-width: min(22em, 100%);
  }
  .ladder li {
    display: flex;
    align-items: center;
    gap: 0.6em;
    padding: 0.2em 0.7em;
    border-radius: 999px;
    color: var(--muted);
    font-weight: 700;
    text-align: left;
  }
  .mini {
    min-width: 6.5em;
    color: var(--gold);
    letter-spacing: 0.05em;
  }
  .ladder .reached {
    background: var(--gold);
    color: var(--ink);
    font-weight: 900;
  }
  .ladder .reached .mini {
    color: #fff;
  }
  .thanks {
    max-width: 34em;
    margin: 0.4em 0;
  }
  .actions {
    display: flex;
    gap: 0.75em;
    flex-wrap: wrap;
    justify-content: center;
  }
</style>
