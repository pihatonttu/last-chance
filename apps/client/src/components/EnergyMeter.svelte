<script lang="ts">
  import { t } from '../i18n/index.ts';
  import { energyPips } from '../lib/hud.ts';

  /** The player's actions this month as lightning bolts: full ones are left to use. */
  let { left, max }: { left: number; max: number } = $props();

  const pips = $derived(energyPips(left, max));
</script>

<div class="energy" class:empty={left <= 0} role="img" aria-label={t('play.energyValue', { left, max })}>
  <span class="label" aria-hidden="true">{t('play.energy')}</span>
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
    gap: 0.15rem;
    padding: 0.35rem 0.7rem 0.45rem;
    border-radius: var(--radius);
    background: rgb(255 255 255 / 0.94);
    box-shadow: var(--shadow);
  }
  .label {
    font-size: 0.8rem;
    font-weight: 800;
    color: var(--muted);
  }
  .bolts {
    display: flex;
    gap: 0.2rem;
  }
  .bolt {
    width: 34px;
    height: 34px;
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
</style>
