<script lang="ts">
  import type { VoteView } from '@saari/protocol';
  import type { Phase, Resources, VoteOption } from '@saari/rules';
  import { formatNumber, t, tp } from '../i18n/index.ts';
  import { buildingName } from '../lib/format.ts';
  import { effectText, missingFor, optionArt, voteShare } from '../lib/vote.ts';
  import type { VoteOutcome } from '../state/reducer.ts';
  import ArtIcon from './ArtIcon.svelte';
  import PropPicture from './PropPicture.svelte';

  /**
   * The month's vote as picture cards: what would be built, its price in wood and stone,
   * and how many have chosen it. Tapping a card votes. What each option does waits behind
   * "What do these do?" (P38: little text at a time).
   */
  interface Props {
    vote: VoteView;
    phase: Phase;
    myVote: string | null;
    pending: string | null;
    villagers: number;
    resources: Resources;
    lastVote: VoteOutcome | null;
    onvote: (option: string) => void;
  }
  let { vote, phase, myVote, pending, villagers, resources, lastVote, onvote }: Props = $props();

  const open = $derived(phase === 'vote');

  function name(option: VoteOption): string {
    return option.kind === 'none' || option.level === 0 ? t('vote.noneShort') : buildingName(option.kind, option.level);
  }
</script>

<section class="vote" aria-labelledby="vote-title">
  <h2 id="vote-title">{t('vote.title')}</h2>
  <p class="intro">{open ? t('vote.subtitle') : t('vote.upcoming')}</p>
  {#if lastVote && !lastVote.ok}
    <p class="error" role="alert">{t(`voteRefusal.${lastVote.reason}`)}</p>
  {/if}

  <ul class="cards">
    {#each vote.options as option (option.id)}
      {@const mine = myVote === option.id}
      {@const missing = missingFor(option, resources)}
      {@const blocked = option.blocked.length > 0}
      {@const count = vote.counts[option.id] ?? 0}
      <li>
        <button
          type="button"
          class="card"
          class:mine
          class:blocked
          aria-pressed={mine}
          disabled={!open || blocked || pending !== null}
          onclick={() => onvote(option.id)}
        >
          {#if mine}<span class="check" aria-hidden="true">✓</span>{/if}
          <PropPicture texture={optionArt(option)} size={92} />
          <span class="name">{name(option)}</span>
          {#if option.kind !== 'none' && option.level > 0}
            <span class="stars" aria-label={t('vote.level', { level: option.level })}>
              {#each [1, 2, 3] as star (star)}<span class:on={star <= option.level}>★</span>{/each}
            </span>
          {/if}
          <span class="cost">
            {#if option.cost.wood === 0 && option.cost.stone === 0}
              <span class="free">{t('vote.freeShort')}</span>
            {/if}
            {#if option.cost.wood > 0}
              <span class="price" class:short={missing.wood > 0}><ArtIcon name="wood" size={22} />{formatNumber(option.cost.wood)}</span>
            {/if}
            {#if option.cost.stone > 0}
              <span class="price" class:short={missing.stone > 0}><ArtIcon name="stone" size={22} />{formatNumber(option.cost.stone)}</span>
            {/if}
          </span>
          {#if blocked}
            <span class="lock">
              {#if missing.space}{t('vote.blocked.space')}{:else}{t('vote.missing')}{/if}
            </span>
          {/if}
          <span class="tally" aria-label={tp('vote.votes', count)}>
            <span class="bar"><span style:width="{voteShare(vote, option.id) * 100}%"></span></span>
            <span class="count">{formatNumber(count)}</span>
          </span>
          {#if mine}<span class="visually-hidden">{t('vote.yourChoice')}</span>{/if}
        </button>
      </li>
    {/each}
  </ul>

  <details class="more">
    <summary>{t('vote.whatDo')}</summary>
    <ul class="effects">
      {#each vote.options as option (option.id)}
        <li><strong>{name(option)}</strong>: {effectText(option, villagers)}</li>
      {/each}
    </ul>
  </details>
</section>

<style>
  .vote h2 {
    margin: 0;
    font-size: 1.4rem;
  }
  .intro {
    margin: 0.2rem 0 0.75rem;
    color: var(--muted);
    font-weight: 700;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr));
    gap: 0.6rem;
  }
  .card {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
    padding: 0.5rem 0.5rem 0.6rem;
    border: 3px solid var(--line);
    border-radius: var(--radius);
    background: var(--card);
    font: inherit;
    color: var(--ink);
    cursor: pointer;
    transition:
      transform 120ms ease,
      border-color 120ms ease;
  }
  .card:not(:disabled):hover {
    border-color: var(--primary);
    transform: translateY(-2px);
  }
  .card:disabled {
    cursor: default;
  }
  .card.mine {
    border-color: var(--ok);
    background: var(--ok-soft);
    box-shadow: 0 0 0 3px var(--ok);
  }
  .card.blocked {
    background: var(--card-2);
  }
  .card.blocked :global(.pic) {
    filter: grayscale(1);
    opacity: 0.55;
  }
  .check {
    position: absolute;
    top: -0.6rem;
    right: -0.6rem;
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    background: var(--ok);
    color: #fff;
    font-weight: 900;
    font-size: 1.1rem;
    box-shadow: var(--shadow);
  }
  .name {
    font-weight: 900;
    font-size: 1.05rem;
    line-height: 1.15;
    text-align: center;
  }
  .stars {
    color: #d5dbe0;
    font-size: 1rem;
    letter-spacing: 0.1em;
    line-height: 1;
  }
  .stars .on {
    color: var(--gold);
  }
  .cost {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.4rem;
    min-height: 26px;
  }
  .price {
    display: inline-flex;
    align-items: center;
    gap: 0.15rem;
    font-weight: 900;
    font-variant-numeric: tabular-nums;
  }
  .price.short {
    color: var(--danger);
  }
  .free {
    font-weight: 800;
    color: var(--ok);
  }
  .lock {
    font-size: 0.8rem;
    font-weight: 800;
    color: var(--danger);
    text-align: center;
  }
  .tally {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    width: 100%;
    margin-top: auto;
  }
  .tally .bar {
    flex: 1;
  }
  .tally .bar > span {
    background: var(--accent);
    transition: width 300ms ease;
  }
  .count {
    min-width: 1.5em;
    font-weight: 900;
    font-variant-numeric: tabular-nums;
    text-align: right;
  }
  .more {
    margin-top: 0.75rem;
  }
  .more summary {
    min-height: 40px;
    display: flex;
    align-items: center;
    font-weight: 800;
    color: var(--primary-dark);
    cursor: pointer;
  }
  .effects li {
    margin: 0.3rem 0;
  }
  .error {
    color: var(--danger);
    font-weight: 700;
  }
</style>
