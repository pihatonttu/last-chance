<script lang="ts">
  import type { Yield } from '@saari/rules';
  import { formatNumber } from '../i18n/index.ts';
  import { ENERGY_COST, pillResult } from '../lib/action-pill.ts';
  import ArtIcon from './ArtIcon.svelte';
  import MoodFace from './MoodFace.svelte';

  /**
   * The pill under every action button: one energy in, what the action gives out
   * (docs/12-selkeys.md §2). Wood, stone and food are the game's own pictures, work and
   * progress are pips (or "3 / 8" when the job is long), recreation is the mood face.
   * The button's aria-label says the same in words, so this stays a picture.
   */
  let { gain }: { gain: Yield } = $props();

  const result = $derived(pillResult(gain));
</script>

<span class="pill">
  <span class="cost">−{formatNumber(ENERGY_COST)}</span>
  <!-- The bolt of the energy meter. -->
  <svg viewBox="0 0 24 24" class="bolt" aria-hidden="true">
    <path d="M13.5 1.5 L4 13.5 H10.5 L9 22.5 L20 9.5 H13 Z" />
  </svg>
  {#if result.type !== 'none'}
    <span class="arrow" aria-hidden="true">→</span>
    {#if result.type === 'resource'}
      <span class="gets">+{formatNumber(result.amount)}</span><ArtIcon name={result.resource} size={26} />
    {:else if result.type === 'pips'}
      <span class="pips" aria-hidden="true">
        {#each result.pips as pip, i (i)}
          <span class="pip" data-pip={pip.state} style:--fill="{pip.fill * 100}%"></span>
        {/each}
      </span>
    {:else if result.type === 'count'}
      <span class="gets">{formatNumber(result.after)} / {formatNumber(result.needed)}</span>
    {:else}
      <MoodFace mood={5} size={26} />
    {/if}
  {/if}
</span>

<style>
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.1rem 0.65rem 0.1rem 0.5rem;
    border-radius: 999px;
    border: 1px solid var(--pill-edge, transparent);
    background: var(--pill-bg, #fff);
    color: var(--ink);
    font-size: 1rem;
    font-weight: 900;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .bolt {
    width: 20px;
    height: 20px;
    flex: none;
  }
  .bolt path {
    fill: #ffcf3f;
    stroke: #b07d00;
    stroke-width: 1.5;
    stroke-linejoin: round;
  }
  .arrow {
    color: var(--muted);
  }
  .pips {
    display: inline-flex;
    gap: 0.4rem;
    padding: 0 0.15rem;
  }
  .pip {
    width: 15px;
    height: 15px;
    box-sizing: border-box;
    border: 2px solid var(--pip, var(--primary));
    border-radius: 50%;
    background: linear-gradient(90deg, var(--pip, var(--primary)) var(--fill), transparent var(--fill));
  }
  /* The step this action adds is ringed in gold, so it reads as "new". */
  .pip[data-pip='add'] {
    box-shadow: 0 0 0 2px var(--gold);
  }
</style>
