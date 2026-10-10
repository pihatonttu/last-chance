<script lang="ts">
  import { t } from '../i18n/index.ts';
  import type { TickerEvent } from '@saari/protocol';
  import { tickerText } from '../lib/format.ts';
  import type { TickerItem } from '../state/reducer.ts';
  import ArtIcon from './ArtIcon.svelte';
  import PropPicture from './PropPicture.svelte';

  /** Newest first. Never names anyone (P34). */
  let { items, limit = 6 }: { items: readonly TickerItem[]; limit?: number } = $props();

  const shown = $derived([...items].reverse().slice(0, limit));

  /** A small picture per event, from the map's own art. */
  function picture(event: TickerEvent): string | null {
    switch (event.kind) {
      case 'spring-found':
        return 'props/spring';
      case 'field-ready':
        return 'props/field-0';
      case 'quarry-ready':
        return 'props/quarry';
      case 'forest-cleared':
        return 'props/meadow-b';
      case 'built':
        return /^[a-z]+-[123]$/.test(event.option) ? `props/${event.option}` : null;
      default:
        return null;
    }
  }
</script>

<section class="ticker" aria-labelledby="ticker-title">
  <h2 id="ticker-title">{t('ticker.title')}</h2>
  <ol aria-live="polite">
    {#each shown as item (item.id)}
      {@const art = picture(item.event)}
      <li class={item.event.kind}>
        {#if art}<PropPicture texture={art} size={34} />{:else if item.event.kind === 'food-short'}<ArtIcon name="food" size={30} />{/if}
        <span>{tickerText(item.event)}</span>
      </li>
    {:else}
      <li class="empty">{t('ticker.empty')}</li>
    {/each}
  </ol>
</section>

<style>
  h2 {
    margin: 0 0 0.4em;
    font-size: 1em;
    color: var(--muted);
  }
  ol {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.35em;
  }
  li {
    display: flex;
    align-items: center;
    gap: 0.45em;
    padding: 0.3em 0.6em;
    border-left: 5px solid var(--primary);
    border-radius: 6px;
    background: var(--card-2);
    font-weight: 700;
    animation: slide-in 300ms ease-out;
  }
  li:first-child {
    background: var(--primary-soft);
  }
  .spring-found,
  .built {
    border-color: var(--ok);
  }
  .tie,
  .food-short {
    border-color: var(--danger);
  }
  .empty {
    color: var(--muted);
    border-color: var(--line);
    font-weight: 600;
  }
  @keyframes slide-in {
    from {
      opacity: 0;
      transform: translateY(-6px);
    }
  }
</style>
