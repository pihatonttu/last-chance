<script lang="ts">
  import type { ActionPreview, Coord, Phase, PublicTile } from '@saari/rules';
  import { formatNumber, t } from '../i18n/index.ts';
  import { actionName, buildingTitle, gainText, terrainDescription, terrainName, yieldGain } from '../lib/format.ts';
  import { exploreNeeded, shelterPeople, stockMax, tileUseCapacity, workNeeded } from '../lib/rules-info.ts';
  import type { ActOutcome } from '../state/reducer.ts';

  interface Props {
    tile: PublicTile;
    landing: Coord;
    villagers: number;
    phase: Phase;
    preview: ActionPreview | null;
    pending: boolean;
    lastAct: ActOutcome | null;
    onact: () => void;
  }
  let { tile, landing, villagers, phase, preview, pending, lastAct, onact }: Props = $props();

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
  <h2 id="tile-title">{title}</h2>
  {#if isLanding}<p class="landing">{t('tile.landing')}</p>{/if}
  <p class="description">{description}</p>

  {#each meters as meter (meter.label)}
    <div class="meter">
      <span>{meter.label}</span>
      <div class="bar" aria-hidden="true"><span style:width="{Math.min(1, meter.share) * 100}%"></span></div>
    </div>
  {/each}

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
          {#if preview.yield.type !== 'none'}<span class="gain">{yieldGain(preview.yield)}</span>{/if}
        {/if}
      </button>
      {#each detail as line (line)}
        <p class="detail">{line}</p>
      {/each}
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
  <p class="coords muted">{t('tile.coords', { x: formatNumber(tile.x), y: formatNumber(tile.y) })}</p>
</section>

<style>
  .tile-panel {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  h2 {
    margin: 0;
    font-size: 1.4rem;
  }
  .landing {
    margin: 0;
    font-weight: 800;
    color: var(--primary-dark);
  }
  .description {
    margin: 0;
  }
  .meter {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    font-weight: 700;
    font-size: 0.92rem;
  }
  .action {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    margin-top: 0.25rem;
    padding-top: 0.75rem;
    border-top: 2px solid var(--line);
  }
  .act {
    width: 100%;
    flex-wrap: wrap;
  }
  .gain {
    padding: 0.05em 0.5em;
    border-radius: 999px;
    background: rgb(255 255 255 / 0.22);
    white-space: nowrap;
  }
  .detail {
    margin: 0;
    font-weight: 700;
  }
  .reason {
    margin: 0;
    color: var(--danger);
    font-weight: 800;
  }
  .done {
    margin: 0;
    color: var(--ok);
    font-weight: 800;
  }
  .coords {
    margin: 0;
    font-size: 0.8rem;
  }
</style>
