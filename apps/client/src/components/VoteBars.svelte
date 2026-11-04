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
   * Counts only, never names (P34). The phase's big title is in the top bar. Every option and
   * its tally must fit on the screen at once, because nobody scrolls a projector during a
   * meeting, so the small line of the pupils' cards is left out.
   */
  interface Props {
    vote: VoteView;
    voters: number;
    /** The village's size N, which the numbers on the cards are counted from. */
    villagers: number;
    /** Homes now: the number the top bar shows, the "before" of every home row. */
    shelterCapacity: number;
    resources: Resources;
    /** Action phase: the options the class can plan for, without bars. */
    compact?: boolean;
  }
  let { vote, voters, villagers, shelterCapacity, resources, compact = false }: Props = $props();

  const PICTURE = 44;
</script>

<section class="vote-bars" aria-labelledby="vote-bars-title">
  <h2 id="vote-bars-title" class="visually-hidden">{t('vote.title')}</h2>
  <p class="cast">{compact ? t('vote.upcoming') : t('vote.cast', { cast: vote.votesCast, total: voters })}</p>
  <ol class:compact>
    {#each vote.options as option (option.id)}
      {@const card = optionCard(option, { villagers, shelterCapacity })}
      {@const count = vote.counts[option.id] ?? 0}
      {@const missing = missingFor(option, resources)}
      {@const building = option.kind !== 'none' && option.level > 0}
      <li class:blocked={option.blocked.length > 0}>
        <!-- There even without a picture, so the names and the bars stand in line. -->
        <span class="pics">
          {#if card.fromArt}
            <PropPicture texture={card.fromArt} size={PICTURE} />
            <span class="arrow" aria-hidden="true">→</span>
          {/if}
          {#if card.art}<PropPicture texture={card.art} size={PICTURE} />{/if}
        </span>
        <div class="body">
          <span class="name">
            {card.name}
            {#if building && option.level > 1}<span class="stars">{'★'.repeat(option.level)}</span>{/if}
          </span>
          <span class="cost">
            {#if option.cost.wood > 0}<span class:short={missing.wood > 0}><ArtIcon name="wood" size={20} />{formatNumber(option.cost.wood)}</span>{/if}
            {#if option.cost.stone > 0}<span class:short={missing.stone > 0}><ArtIcon name="stone" size={20} />{formatNumber(option.cost.stone)}</span>{/if}
          </span>
          <div class="gain" class:none={!building}>{card.benefit}</div>
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
    gap: 0.5em;
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
    justify-content: center;
    /* Two pictures and an arrow. */
    width: 6em;
  }
  .arrow {
    font-weight: 900;
    color: var(--primary);
  }
  .blocked :global(.pic) {
    filter: grayscale(1);
    opacity: 0.55;
  }
  /* Two rows: the name and its price, then the big line and its tally, in one column for all. */
  .body {
    flex: 1;
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 8em;
    align-items: center;
    gap: 0 0.6em;
    line-height: 1.2;
  }
  .compact .body {
    grid-template-columns: minmax(0, 1fr) auto;
  }
  .compact .gain,
  .lock {
    grid-column: 1 / -1;
  }
  .name {
    font-weight: 800;
  }
  .stars {
    color: var(--gold);
    margin-left: 0.2em;
  }
  .cost {
    justify-self: end;
    display: inline-flex;
    gap: 0.4em;
    font-size: 0.9em;
    font-weight: 800;
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
    font-weight: 900;
    color: var(--primary-dark);
  }
  .gain.none {
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
    line-height: 1.1;
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
