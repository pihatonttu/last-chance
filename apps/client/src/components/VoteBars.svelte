<script lang="ts">
  import type { VoteView } from '@saari/protocol';
  import type { Resources, VoteOption } from '@saari/rules';
  import { formatNumber, t, tp } from '../i18n/index.ts';
  import { buildingName } from '../lib/format.ts';
  import { missingFor, optionArt, voteShare } from '../lib/vote.ts';
  import ArtIcon from './ArtIcon.svelte';
  import PropPicture from './PropPicture.svelte';

  /** Live vote for the projector: pictures, prices and bars. Counts only, never names (P34). */
  interface Props {
    vote: VoteView;
    voters: number;
    resources: Resources;
    /** Action phase: the options the class can plan for, without bars. */
    compact?: boolean;
  }
  let { vote, voters, resources, compact = false }: Props = $props();

  function name(option: VoteOption): string {
    return option.kind === 'none' || option.level === 0 ? t('vote.noneShort') : buildingName(option.kind, option.level);
  }
</script>

<section class="vote-bars" aria-labelledby="vote-bars-title">
  <h2 id="vote-bars-title">{t('vote.title')}</h2>
  <p class="cast">{compact ? t('vote.upcoming') : t('vote.cast', { cast: vote.votesCast, total: voters })}</p>
  <ol>
    {#each vote.options as option (option.id)}
      {@const count = vote.counts[option.id] ?? 0}
      {@const missing = missingFor(option, resources)}
      <li class:blocked={option.blocked.length > 0}>
        <PropPicture texture={optionArt(option)} size={52} />
        <div class="body">
          <div class="head">
            <span class="name">
              {name(option)}
              {#if option.kind !== 'none' && option.level > 1}<span class="stars">{'★'.repeat(option.level)}</span>{/if}
            </span>
            <span class="cost">
              {#if option.cost.wood > 0}<span class:short={missing.wood > 0}><ArtIcon name="wood" size={20} />{formatNumber(option.cost.wood)}</span>{/if}
              {#if option.cost.stone > 0}<span class:short={missing.stone > 0}><ArtIcon name="stone" size={20} />{formatNumber(option.cost.stone)}</span>{/if}
            </span>
          </div>
          {#if !compact}
            <div class="tally">
              <div class="bar"><span style:width="{voteShare(vote, option.id) * 100}%"></span></div>
              <span class="count" aria-label={tp('vote.votes', count)}>{formatNumber(count)}</span>
            </div>
          {/if}
          {#if missing.space}<span class="lock">{t('vote.blocked.space')}</span>{/if}
        </div>
      </li>
    {/each}
  </ol>
</section>

<style>
  .vote-bars h2 {
    margin: 0;
    font-size: 1.3em;
  }
  .cast {
    margin: 0.1em 0 0.6em;
    color: var(--muted);
    font-weight: 700;
  }
  ol {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5em;
  }
  li {
    display: flex;
    align-items: center;
    gap: 0.5em;
  }
  .blocked :global(.pic) {
    filter: grayscale(1);
    opacity: 0.55;
  }
  .body {
    flex: 1;
    min-width: 0;
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5em;
    font-weight: 800;
  }
  .stars {
    color: var(--gold);
    margin-left: 0.2em;
  }
  .cost {
    display: inline-flex;
    gap: 0.4em;
    font-size: 0.9em;
    font-variant-numeric: tabular-nums;
  }
  .cost > span {
    display: inline-flex;
    align-items: center;
    gap: 0.1em;
  }
  .short {
    color: var(--danger);
  }
  .tally {
    display: flex;
    align-items: center;
    gap: 0.5em;
  }
  .bar {
    flex: 1;
    height: 0.8em;
  }
  .bar > span {
    background: var(--accent);
    transition: width 300ms ease;
  }
  .count {
    min-width: 1.5em;
    text-align: right;
    font-weight: 900;
    font-variant-numeric: tabular-nums;
  }
  .lock {
    font-size: 0.8em;
    font-weight: 700;
    color: var(--danger);
  }
  .blocked .name {
    color: var(--muted);
  }
</style>
