<script lang="ts">
  import type { Yield } from '@saari/rules';
  import { formatNumber, t } from '../i18n/index.ts';
  import { yieldGain } from '../lib/format.ts';
  import ArtIcon from './ArtIcon.svelte';

  /** What an action gives: wood, stone or food as a picture and a number, anything else as words. */
  let { gain }: { gain: Yield } = $props();
</script>

{#if gain.type === 'resource'}
  <span class="chip" title={yieldGain(gain)}>
    +{formatNumber(gain.amount)}<ArtIcon name={gain.resource} size={26} />
    <span class="visually-hidden">{t(`bar.${gain.resource}`)}</span>
  </span>
{:else if gain.type !== 'none'}
  <span class="chip">{yieldGain(gain)}</span>
{/if}

<style>
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 0.15em;
    padding: 0.05em 0.5em;
    border-radius: 999px;
    background: rgb(255 255 255 / 0.25);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
</style>
