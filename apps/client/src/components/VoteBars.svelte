<script lang="ts">
  import type { VoteView } from '@saari/protocol';
  import type { Resources } from '@saari/rules';
  import { t, tp } from '../i18n/index.ts';
  import { optionName } from '../lib/format.ts';
  import { blockedReasons, costParts, voteShare } from '../lib/vote.ts';

  /** Live vote distribution for the projector. Counts only, never names (P34). */
  interface Props {
    vote: VoteView;
    voters: number;
    resources: Resources;
    /** Action phase: the options the class can plan for, without bars. */
    compact?: boolean;
  }
  let { vote, voters, resources, compact = false }: Props = $props();
</script>

<section class="vote-bars" aria-labelledby="vote-bars-title">
  <h2 id="vote-bars-title">{t('vote.title')}</h2>
  <p class="cast">{compact ? t('vote.upcoming') : t('vote.cast', { cast: vote.votesCast, total: voters })}</p>
  <ol>
    {#each vote.options as option (option.id)}
      {@const count = vote.counts[option.id] ?? 0}
      {@const share = voteShare(vote, option.id)}
      <li class:blocked={option.blocked.length > 0}>
        <div class="head">
          <span class="name">{optionName(option)}</span>
          {#if !compact}<span class="count">{tp('vote.votes', count)}</span>{/if}
        </div>
        {#if !compact}<div class="bar"><span style:width="{share * 100}%"></span></div>{/if}
        <div class="cost">
          {costParts(option).join(' + ')}{#if option.blocked.length > 0}
            · {blockedReasons(option, resources).join(', ')}{/if}
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
    gap: 0.6em;
  }
  .head {
    display: flex;
    justify-content: space-between;
    gap: 0.5em;
    font-weight: 800;
  }
  .count {
    font-variant-numeric: tabular-nums;
  }
  .bar {
    height: 0.8em;
    margin: 0.2em 0;
  }
  .bar > span {
    background: var(--accent);
    transition: width 300ms ease;
  }
  .cost {
    font-size: 0.8em;
    color: var(--muted);
  }
  .blocked .name {
    color: var(--muted);
  }
</style>
