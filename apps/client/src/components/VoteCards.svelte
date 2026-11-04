<script lang="ts">
  import type { VoteView } from '@saari/protocol';
  import type { Phase, Resources } from '@saari/rules';
  import { formatNumber, t, tp } from '../i18n/index.ts';
  import { missingFor, optionCard, voteShare } from '../lib/vote.ts';
  import type { VoteOutcome } from '../state/reducer.ts';
  import ArtIcon from './ArtIcon.svelte';
  import Icon from './Icon.svelte';
  import PropPicture from './PropPicture.svelte';

  /**
   * The month's vote as picture cards. Each card tells at once what the village gets (one big
   * line, with before → after numbers where a building grows), what the children must then do
   * (one small line), what it costs and how many have chosen it, so nothing is hidden behind a
   * button (P38: little text at a time). Tapping a card votes. A red line warns when the
   * option's wood would leave the village fire short, or when there is no snow field to build
   * on. The phase's big title is in the top bar; the heading here is for screen readers.
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
</script>

<section class="vote" aria-labelledby="vote-title">
  <h2 id="vote-title" class="visually-hidden">{t('vote.title')}</h2>
  <p class="intro">{open ? t('vote.subtitle') : t('vote.upcoming')}</p>
  {#if lastVote && !lastVote.ok}
    <p class="error" role="alert">{t(`voteRefusal.${lastVote.reason}`)}</p>
  {/if}

  <ul class="cards">
    {#each vote.options as option (option.id)}
      {@const card = optionCard(option, villagers)}
      {@const mine = myVote === option.id}
      {@const missing = missingFor(option, resources)}
      {@const blocked = option.blocked.length > 0}
      {@const building = option.kind !== 'none' && option.level > 0}
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
          {#if card.art}
            <span class="pics">
              {#if card.fromArt}
                <PropPicture texture={card.fromArt} size={104} />
                <span class="arrow" aria-hidden="true">→</span>
              {/if}
              <PropPicture texture={card.art} size={104} />
            </span>
          {/if}
          <span class="name">
            {card.name}
            {#if building}
              <span class="stars" aria-label={t('vote.level', { level: option.level })}>
                {#each [1, 2, 3] as star (star)}<span class:on={star <= option.level}>★</span>{/each}
              </span>
            {/if}
          </span>
          <span class="gain" class:none={!building}>{card.benefit}</span>
          {#if missing.space}
            <span class="lock">{t('vote.blocked.space')}</span>
          {:else}
            <span class="why">{card.reason}</span>
          {/if}
          {#if building}
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
          {/if}
          {#if blocked}
            {#if !missing.space}<span class="lock">{t('vote.missing')}</span>{/if}
          {:else if option.leavesFireCold}
            <!-- A warning only: the vote is still accepted (docs/10-arktinen.md §4). -->
            <span class="fire-cold"><Icon name="thermometer" size={18} />{t('vote.fireCold')}</span>
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
</section>

<style>
  .intro {
    margin: 0 0 0.75rem;
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
    /* Wide enough for two 104 px pictures and the arrow of an upgrade. */
    grid-template-columns: repeat(auto-fill, minmax(min(17rem, 100%), 1fr));
    gap: 0.6rem;
  }
  .card {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.3rem;
    padding: 0.5rem 0.6rem 0.6rem;
    border: 3px solid var(--line);
    border-radius: var(--radius);
    background: var(--card);
    font: inherit;
    color: var(--ink);
    text-align: left;
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
  .pics {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.2rem;
  }
  .arrow {
    font-size: 1.6rem;
    font-weight: 900;
    color: var(--primary);
  }
  .name {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.1rem 0.5rem;
    font-weight: 900;
    font-size: 1.15rem;
    line-height: 1.1;
  }
  .stars {
    color: #d5dbe0;
    font-size: 0.95rem;
    letter-spacing: 0.1em;
    line-height: 1;
  }
  .stars .on {
    color: var(--gold);
  }
  .gain {
    display: flex;
    align-items: center;
    min-height: 2.4rem;
    padding: 0.25rem 0.5rem;
    border-radius: 9px;
    background: var(--primary-soft);
    color: var(--primary-dark);
    font-size: 1.05rem;
    font-weight: 900;
    line-height: 1.15;
  }
  .gain.none {
    background: var(--card-2);
    color: var(--muted);
  }
  .why {
    font-size: 0.85rem;
    font-weight: 700;
    line-height: 1.25;
    color: var(--muted);
  }
  .cost {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
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
    font-size: 0.85rem;
    font-weight: 800;
    line-height: 1.25;
    color: var(--danger);
  }
  .fire-cold {
    display: inline-flex;
    align-items: center;
    gap: 0.15rem;
    align-self: flex-start;
    padding: 0.1rem 0.45rem 0.1rem 0.2rem;
    border-radius: 6px;
    background: var(--danger-soft);
    color: var(--danger);
    font-size: 0.8rem;
    font-weight: 800;
    line-height: 1.15;
  }
  .tally {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-top: auto;
    padding-top: 0.2rem;
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
  .error {
    color: var(--danger);
    font-weight: 700;
  }
</style>
