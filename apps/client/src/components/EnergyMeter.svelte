<script lang="ts">
  import { t } from '../i18n/index.ts';
  import { energyPips } from '../lib/hud.ts';

  /** The player's actions this month, in words and as big bolts: full ones are left to use. */
  let { left, max }: { left: number; max: number } = $props();

  const pips = $derived(energyPips(left, max));
</script>

<div class="energy" class:empty={left <= 0} role="img" aria-label={t('play.energyValue', { left, max })}>
  <span class="label" aria-hidden="true">{t('play.energy', { n: Math.max(0, left) })}</span>
  <span class="bolts" aria-hidden="true">
    {#each pips as full, i (i)}
      <svg viewBox="0 0 24 24" class="bolt" class:full>
        <path d="M13.5 1.5 L4 13.5 H10.5 L9 22.5 L20 9.5 H13 Z" />
      </svg>
    {/each}
  </span>
</div>

<style>
  .energy {
    display: inline-flex;
    flex-direction: column;
    gap: 0.1rem;
    padding: 0.4rem 0.8rem 0.5rem;
    border-radius: var(--radius);
    background: var(--card);
    box-shadow: var(--shadow);
  }
  .label {
    font-size: 1.15rem;
    font-weight: 900;
    line-height: 1.1;
    color: var(--ink);
  }
  .bolts {
    display: flex;
    flex-wrap: wrap;
    gap: 0.1rem;
  }
  .bolt {
    width: 46px;
    height: 46px;
  }
  .bolt path {
    fill: #dfe4e8;
    stroke: #b4bec6;
    stroke-width: 1.5;
    stroke-linejoin: round;
  }
  .bolt.full path {
    fill: #ffcf3f;
    stroke: #b07d00;
  }
  @media (max-width: 640px) {
    .energy {
      padding: 0.3rem 0.6rem 0.35rem;
    }
    .label {
      font-size: 1rem;
    }
    .bolt {
      width: 36px;
      height: 36px;
    }
  }
</style>
