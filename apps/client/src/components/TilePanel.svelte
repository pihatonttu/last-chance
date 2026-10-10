<script lang="ts">
  import type { ActionPreview, Coord, Phase, PublicTile } from '@saari/rules';
  import { formatNumber, t } from '../i18n/index.ts';
  import { actionName, buildingTitle, gainText, terrainDescription, terrainName } from '../lib/format.ts';
  import { exploreNeeded, shelterPeople, stockMax, tileUseCapacity, workNeeded } from '../lib/rules-info.ts';
  import type { ActOutcome } from '../state/reducer.ts';
  import GainChip from './GainChip.svelte';

  /**
   * What a tapped tile offers, as a small popup: its name and one big action button.
   * The rest (description, stock, work, uses) waits behind "More info" so the screen
   * stays calm for young players.
   */
  interface Props {
    tile: PublicTile;
    landing: Coord;
    villagers: number;
    phase: Phase;
    preview: ActionPreview | null;
    pending: boolean;
    lastAct: ActOutcome | null;
    onact: () => void;
    onclose: () => void;
  }
  let { tile, landing, villagers, phase, preview, pending, lastAct, onact, onclose }: Props = $props();

  const isLanding = $derived(tile.x === landing.x && tile.y === landing.y);
  const title = $derived(tile.building ? buildingTitle(tile.building.kind, tile.building.level) : terrainName(tile));
  const description = $derived.by(() => {
    const b = tile.building;
    if (!b) return terrainDescription(tile);
    if (b.kind === 'shelter') return t('building.shelter.description', { people: shelterPeople(b.level, villagers) });
    return t(`building.${b.kind}.description`);
  });

  interface Meter {
    label: string;
    share: number;
  }

  const meters = $derived.by((): Meter[] => {
    const list: Meter[] = [];
    if (tile.fog) {
      const needed = exploreNeeded(tile, landing);
      list.push({ label: t('tile.explore', { done: tile.exploreWork, needed }), share: tile.exploreWork / needed });
      return list;
    }
    const terrain = tile.terrain;
    if (!terrain) return list;
    const max = stockMax(terrain);
    if (max !== null && tile.stock !== null && !tile.building) {
      const key = terrain === 'forest' ? 'tile.stock.forest' : terrain === 'field' ? 'tile.stock.field' : 'tile.stock.quarry';
      list.push({ label: t(key, { n: tile.stock, max }), share: tile.stock / max });
    }
    const needed = workNeeded(terrain);
    if (needed !== null && (tile.work ?? 0) > 0 && !tile.building) {
      const key = terrain === 'meadow' ? 'tile.work.plow' : 'tile.work.quarry';
      list.push({ label: t(key, { done: tile.work ?? 0, needed }), share: (tile.work ?? 0) / needed });
    }
    const capacity = tileUseCapacity(tile, villagers);
    if (capacity !== null) {
      const left = Math.max(0, capacity - (tile.uses ?? 0));
      list.push({ label: t('tile.uses', { left, capacity }), share: left / capacity });
    }
    return list;
  });

  const detail = $derived.by((): string[] => {
    if (!preview) return [];
    const y = preview.yield;
    switch (y.type) {
      case 'work': {
        const after = Math.min(y.needed, y.done + y.amount);
        const lines = [t('yield.work', { done: y.done, after, needed: y.needed })];
        if (after + 1e-9 >= y.needed && preview.kind) {
          if (preview.kind === 'explore') lines.push(t('yield.workDone.explore'));
          else if (preview.kind === 'plow') lines.push(t('yield.workDone.plow'));
          else if (preview.kind === 'build-quarry') lines.push(t('yield.workDone.build-quarry'));
        }
        return lines;
      }
      case 'recreation':
        return [t('yield.recreation', { left: y.usesLeft, capacity: y.capacity })];
      case 'progress': {
        const after = y.done + y.amount;
        const lines = [t('yield.skill', { done: y.done, after: Math.min(after, y.needed), needed: y.needed })];
        if (after >= y.needed) lines.push(t('yield.levelUp', { level: y.level + 1 }));
        return lines;
      }
      default:
        return [];
    }
  });

  const actHere = $derived(lastAct && lastAct.x === tile.x && lastAct.y === tile.y ? lastAct : null);
</script>

<section class="tile-panel" aria-labelledby="tile-title" aria-live="polite">
  <header>
    <h2 id="tile-title">{title}</h2>
    <button type="button" class="close" aria-label={t('common.close')} onclick={onclose}>✕</button>
  </header>

  <div class="action">
    {#if phase !== 'action'}
      <p class="muted">{t('action.waitPhase')}</p>
    {:else if !preview}
      <p class="muted">{t('common.loading')}</p>
    {:else if preview.kind === null}
      <p class="muted">{preview.reason && preview.reason !== 'no-action' ? t(`refusal.${preview.reason}`) : t('action.none')}</p>
    {:else}
      <button type="button" class="btn btn-primary btn-big act" disabled={!preview.available || pending} onclick={onact}>
        {#if pending}
          {t('action.pending')}
        {:else}
          <span>{actionName(preview.kind)}</span>
          <GainChip gain={preview.yield} />
        {/if}
      </button>
      {#if preview.yield.type === 'work'}
        {@const y = preview.yield}
        <!-- Shared work: how far it is and how far this action takes it. -->
        <div class="work" aria-label={t('yield.work', { done: y.done, after: Math.min(y.needed, y.done + y.amount), needed: y.needed })}>
          <div class="bar">
            <span class="next" style:width="{Math.min(1, (y.done + y.amount) / y.needed) * 100}%"></span>
            <span style:width="{Math.min(1, y.done / y.needed) * 100}%"></span>
          </div>
          <span class="steps">{formatNumber(y.done)} / {formatNumber(y.needed)}</span>
        </div>
      {/if}
      {#if !preview.available && preview.reason}
        <p class="reason" role="status">{t(`refusal.${preview.reason}`)}</p>
      {/if}
    {/if}
    {#if actHere}
      {#if actHere.ok}
        <p class="done" role="status">{t('action.done', { gain: gainText(actHere.gain) })}</p>
      {:else}
        <p class="reason" role="alert">{t(`refusal.${actHere.reason}`)}</p>
      {/if}
    {/if}
  </div>

  <details class="more">
    <summary>{t('tile.more')}</summary>
    {#if isLanding}<p class="landing">{t('tile.landing')}</p>{/if}
    <p>{description}</p>
    {#each meters as meter (meter.label)}
      <div class="meter">
        <span>{meter.label}</span>
        <div class="bar" aria-hidden="true"><span style:width="{Math.min(1, meter.share) * 100}%"></span></div>
      </div>
    {/each}
    {#each detail as line (line)}
      <p class="detail">{line}</p>
    {/each}
  </details>
</section>

<style>
  .tile-panel {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.5rem;
  }
  h2 {
    margin: 0;
    font-size: 1.35rem;
    line-height: 1.2;
  }
  .close {
    flex: none;
    width: 44px;
    height: 44px;
    margin: -0.35rem -0.35rem 0 0;
    border: none;
    border-radius: 999px;
    background: var(--card-2);
    font-size: 1.1rem;
    font-weight: 900;
    cursor: pointer;
  }
  .action {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .action p {
    margin: 0;
  }
  .act {
    width: 100%;
    flex-wrap: wrap;
  }
  .work {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 800;
  }
  .work .bar {
    position: relative;
    flex: 1;
    height: 0.9rem;
  }
  .work .bar > span {
    position: absolute;
    inset: 0 auto 0 0;
  }
  .work .bar > .next {
    background: var(--primary-soft);
    outline: 2px dashed var(--primary);
    outline-offset: -2px;
  }
  .steps {
    font-variant-numeric: tabular-nums;
    color: var(--muted);
  }
  .reason {
    color: var(--danger);
    font-weight: 800;
  }
  .done {
    color: var(--ok);
    font-weight: 800;
  }
  .more {
    border-top: 2px solid var(--line);
    padding-top: 0.4rem;
  }
  .more summary {
    min-height: 40px;
    display: flex;
    align-items: center;
    font-weight: 800;
    color: var(--primary-dark);
    cursor: pointer;
  }
  .more p {
    margin: 0.35rem 0;
  }
  .landing {
    font-weight: 800;
    color: var(--primary-dark);
  }
  .meter {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    margin: 0.4rem 0;
    font-weight: 700;
    font-size: 0.92rem;
  }
  .detail {
    font-weight: 700;
  }
</style>
