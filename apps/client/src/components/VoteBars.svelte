<script lang="ts">
  import type { VoteView } from '@saari/protocol';
  import type { Resources } from '@saari/rules';
  import { formatNumber, t, tp } from '../i18n/index.ts';
  import { missingFor, optionCard, voteShare } from '../lib/vote.ts';
  import ArtIcon from './ArtIcon.svelte';
  import Icon from './Icon.svelte';
  import PropPicture from './PropPicture.svelte';

  /**
   * Live vote for the projector: pictures, what each option gives, prices and bars, and a red
   * line when an option's wood would leave the village fire short or there is no snow field.
   * Counts only, never names (P34). The phase's big title is in the top bar.
   */
  interface Props {
    vote: VoteView;
    voters: number;
    /** The village's size N, which the numbers on the cards are counted from. */
    villagers: number;
    resources: Resources;
    /** Action phase: the options the class can plan for, without bars. */
    compact?: boolean;
  }
  let { vote, voters, villagers, resources, compact = false }: Props = $props();
</script>

<section class="vote-bars" aria-labelledby="vote-bars-title">
  <h2 id="vote-bars-title" class="visually-hidden">{t('vote.title')}</h2>
  <p class="cast">{compact ? t('vote.upcoming') : t('vote.cast', { cast: vote.votesCast, total: voters })}</p>
  <ol>
    {#each vote.options as option (option.id)}
      {@const card = optionCard(option, villagers)}
      {@const count = vote.counts[option.id] ?? 0}
      {@const missing = missingFor(option, resources)}
      {@const building = option.kind !== 'none' && option.level > 0}
      <li class:blocked={option.blocked.length > 0}>
        {#if card.art}
          <span class="pics">
            {#if card.fromArt}
              <PropPicture texture={card.fromArt} size={52} />
              <span class="arrow" aria-hidden="true">→</span>
            {/if}
            <PropPicture texture={card.art} size={card.fromArt ? 52 : 64} />
          </span>
        {/if}
        <div class="body">
          <div class="head">
            <span class="name">
              {card.name}
              {#if building && option.level > 1}<span class="stars">{'★'.repeat(option.level)}</span>{/if}
            </span>
            <span class="cost">
              {#if option.cost.wood > 0}<span class:short={missing.wood > 0}><ArtIcon name="wood" size={20} />{formatNumber(option.cost.wood)}</span>{/if}
              {#if option.cost.stone > 0}<span class:short={missing.stone > 0}><ArtIcon name="stone" size={20} />{formatNumber(option.cost.stone)}</span>{/if}
            </span>
          </div>
          <div class="gain" class:none={!building}>{card.benefit}</div>
          {#if !compact && !missing.space}<div class="why">{card.reason}</div>{/if}
          {#if !compact}
            <div class="tally">
              <div class="bar"><span style:width="{voteShare(vote, option.id) * 100}%"></span></div>
              <span class="count" aria-label={tp('vote.votes', count)}>{formatNumber(count)}</span>
            </div>
          {/if}
          {#if missing.space}
            <span class="lock">{t('vote.blocked.space')}</span>
          {:else if option.leavesFireCold && option.blocked.length === 0}
            <!-- A warning only: the vote is still accepted (docs/10-arktinen.md §4). -->
            <span class="lock fire-cold"><Icon name="thermometer" size={16} />{t('vote.fireCold')}</span>
          {/if}
        </div>
      </li>
    {/each}
  </ol>
</section>

<style>
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
    gap: 0.6em;
  }
  li {
    display: flex;
    align-items: center;
    gap: 0.5em;
  }
  .pics {
    display: flex;
    flex: none;
    align-items: center;
  }
  .arrow {
    font-weight: 900;
    color: var(--primary);
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
  .gain {
    margin-top: 0.1em;
    font-weight: 900;
    color: var(--primary-dark);
  }
  .gain.none {
    color: var(--muted);
  }
  .why {
    font-size: 0.85em;
    font-weight: 700;
    color: var(--muted);
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
  .fire-cold {
    display: inline-flex;
    align-items: center;
    gap: 0.15em;
    font-weight: 800;
  }
  .blocked .name {
    color: var(--muted);
  }
</style>
