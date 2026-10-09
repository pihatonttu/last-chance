<script lang="ts">
  import type { VoteView } from '@saari/protocol';
  import type { Phase, Resources } from '@saari/rules';
  import { t, tp } from '../i18n/index.ts';
  import { optionName, percent } from '../lib/format.ts';
  import { blockedReasons, costParts, effectText, upgradeText, voteShare } from '../lib/vote.ts';
  import type { VoteOutcome } from '../state/reducer.ts';

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
  <h2 id="vote-title">{t('vote.title')}</h2>
  <p class="muted intro">{open ? t('vote.subtitle') : t('vote.upcoming')}</p>
  {#if lastVote && !lastVote.ok}
    <p class="error" role="alert">{t(`voteRefusal.${lastVote.reason}`)}</p>
  {/if}
  <ul>
    {#each vote.options as option (option.id)}
      {@const mine = myVote === option.id}
      {@const blocked = option.blocked.length > 0}
      {@const count = vote.counts[option.id] ?? 0}
      {@const upgrade = upgradeText(option)}
      <li class="option" class:mine class:blocked>
        <div class="title">
          <strong>{optionName(option)}</strong>
          {#if upgrade}<span class="upgrade">{upgrade}</span>{/if}
          {#if !option.upgrade && option.kind !== 'none'}<span class="new">{t('vote.new')}</span>{/if}
        </div>
        <p class="effect">{effectText(option, villagers)}</p>
        <p class="cost">{costParts(option).join(' + ')}</p>
        {#if blocked}
          <ul class="reasons">
            {#each blockedReasons(option, resources) as reason (reason)}
              <li>{reason}</li>
            {/each}
          </ul>
        {/if}
        <div class="tally" aria-label={tp('vote.votes', count)}>
          <div class="bar"><span style:width="{voteShare(vote, option.id) * 100}%"></span></div>
          <span class="numbers">{percent(voteShare(vote, option.id))} · {tp('vote.votes', count)}</span>
        </div>
        {#if open}
          <button
            type="button"
            class="btn {mine ? 'btn-primary' : 'btn-secondary'}"
            aria-pressed={mine}
            disabled={blocked || pending !== null}
            onclick={() => onvote(option.id)}
          >
            {mine ? t('vote.yourChoice') : t('vote.choose')}
          </button>
        {/if}
      </li>
    {/each}
  </ul>
</section>

<style>
  .vote h2 {
    margin: 0;
  }
  .intro {
    margin: 0.25rem 0 0.75rem;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .vote > ul {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .option {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    padding: 0.75rem;
    border: 2px solid var(--line);
    border-radius: var(--radius-small);
    background: var(--card);
  }
  .option.mine {
    border-color: var(--primary);
    background: var(--primary-soft);
    box-shadow: inset 0 0 0 2px var(--primary);
  }
  .option.blocked {
    background: var(--card-2);
  }
  .title {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 0.6rem;
    align-items: baseline;
    font-size: 1.05rem;
  }
  .upgrade {
    color: var(--muted);
    font-weight: 700;
    font-size: 0.9rem;
  }
  .new {
    padding: 0 0.5em;
    border-radius: 999px;
    background: var(--ok-soft);
    color: var(--ok);
    font-size: 0.8rem;
    font-weight: 800;
  }
  .effect,
  .cost {
    margin: 0;
  }
  .cost {
    font-weight: 800;
  }
  .reasons {
    color: var(--danger);
    font-weight: 700;
    font-size: 0.9rem;
  }
  .tally {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .tally .bar {
    flex: 1;
  }
  .tally .bar > span {
    background: var(--accent);
    transition: width 300ms ease;
  }
  .numbers {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--muted);
    white-space: nowrap;
  }
  .error {
    color: var(--danger);
    font-weight: 700;
  }
</style>
