<script lang="ts">
  import type { VillageView } from '@saari/protocol';
  import type { ActionKind, ActionPreview, Coord, Phase, PublicTile, Yield } from '@saari/rules';
  import { t } from '../i18n/index.ts';
  import { actionLabel } from '../lib/action-pill.ts';
  import { actionName, buildingName, gainText, terrainDescription, terrainName } from '../lib/format.ts';
  import { fireShort, temperatureText } from '../lib/heat.ts';
  import { exploreNeeded, shelterPeople, stockMax, tileUseCapacity, workNeeded } from '../lib/rules-info.ts';
  import type { ActOutcome } from '../state/reducer.ts';
  import ArtIcon from './ArtIcon.svelte';
  import GainChip from './GainChip.svelte';
  import Icon from './Icon.svelte';

  /**
   * What a tapped tile offers, as a small popup: its name and one big action button.
   * Under the button's name is the same pill every time: one energy in, what it gives out
   * (docs/12-selkeys.md §2). A greenhouse has a second, quieter button that tears it down.
   * The rest (description, stock, work, uses) waits behind "More info" so the screen
   * stays calm for young players. The landing is the village fire (docs/10-arktinen.md §6):
   * its popup shows the frost, the forecast and the wood the fire burns, with no button.
   */
  interface Props {
    tile: PublicTile;
    landing: Coord;
    village: VillageView;
    phase: Phase;
    preview: ActionPreview | null;
    pending: boolean;
    lastAct: ActOutcome | null;
    /** The main action of the tile, or `'demolish'` for tearing a greenhouse down. */
    onact: (intent?: 'demolish') => void;
    onclose: () => void;
  }
  let { tile, landing, village, phase, preview, pending, lastAct, onact, onclose }: Props = $props();

  const villagers = $derived(village.villagers);
  const isLanding = $derived(tile.x === landing.x && tile.y === landing.y);
  const fireCold = $derived(fireShort(village));
  const title = $derived(
    isLanding ? t('fire.title') : tile.building ? buildingName(tile.building.kind, tile.building.level) : terrainName(tile),
  );
  const description = $derived.by(() => {
    const b = tile.building;
    if (!b) return terrainDescription(tile);
    if (b.kind === 'shelter') return t('building.shelter.description', { people: shelterPeople(b.level, villagers) });
    return t(`building.${b.kind}.description`);
  });

  /** One short line on what a building gives, shown without opening "More info" (docs/12-selkeys.md §3). */
  const gives = $derived.by((): string | null => {
    const b = tile.building;
    if (!b || tile.fog || isLanding) return null;
    switch (b.kind) {
      case 'shelter':
        return t('tile.gives.shelter', { n: shelterPeople(b.level, villagers) });
      case 'school':
        return t('tile.gives.school');
      case 'workshop':
        return t('tile.gives.workshop');
      case 'gathering':
        return t('tile.gives.gathering');
    }
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

  /** The "More info" lines of one action: how far its work or skill goes, and what finishing it does. */
  function detailLines(kind: ActionKind | null, y: Yield): string[] {
    switch (y.type) {
      case 'work': {
        const after = Math.min(y.needed, y.done + y.amount);
        const lines = [t('yield.work', { done: y.done, after, needed: y.needed })];
        if (after + 1e-9 >= y.needed && kind) {
          if (kind === 'explore') lines.push(t('yield.workDone.explore'));
          else if (kind === 'plow') lines.push(t('yield.workDone.plow'));
          else if (kind === 'demolish') lines.push(t('yield.workDone.demolish'));
          else if (kind === 'build-quarry') lines.push(t('yield.workDone.build-quarry'));
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
  }

  const detail = $derived.by((): string[] => {
    if (!preview) return [];
    const lines = detailLines(preview.kind, preview.yield);
    if (preview.alternative) lines.push(...detailLines(preview.alternative.kind, preview.alternative.yield));
    return lines;
  });

  const alternative = $derived(preview?.alternative ?? null);
  /** Snow fields left after this greenhouse: a calm note beside the plow button, never a block (docs/12-selkeys.md §1). */
  const meadowNote = $derived.by((): string | null => {
    if (!preview || preview.kind !== 'plow' || preview.freeMeadowsAfter === undefined) return null;
    const n = preview.freeMeadowsAfter;
    return n > 0 ? t('tile.meadowsLeft', { n }) : t('tile.meadowsNone');
  });
  /** Both buttons often fail for the same reason (no energy): say it once. */
  const alternativeReason = $derived.by(() => {
    if (!alternative || alternative.available || !alternative.reason) return null;
    return preview && !preview.available && preview.reason === alternative.reason ? null : alternative.reason;
  });
  const sharedReason = $derived(
    alternative && !alternative.available && alternative.reason && alternativeReason === null ? 'act-reason' : undefined,
  );

  /** Which button was pressed, so only that one shows "Tehdään…" while the server answers. */
  let pressed = $state<'main' | 'demolish'>('main');

  function press(intent?: 'demolish'): void {
    pressed = intent ?? 'main';
    if (intent) onact(intent);
    else onact();
  }

  const actHere = $derived(lastAct && lastAct.x === tile.x && lastAct.y === tile.y ? lastAct : null);
</script>

<section class="tile-panel" aria-labelledby="tile-title" aria-live="polite">
  <header>
    <h2 id="tile-title">{title}</h2>
    <button type="button" class="close" aria-label={t('common.close')} onclick={onclose}>✕</button>
  </header>

  {#if isLanding}
    <div class="fire">
      <div class="temps">
        <span class="temp">
          <Icon name="thermometer" size={40} />
          <span><small>{t('fire.now')}</small><strong>{temperatureText(village.temperature)}</strong></span>
        </span>
        {#if village.forecast !== null}
          <span class="temp next">
            <span><small>{t('fire.forecast')}</small><strong>{temperatureText(village.forecast)}</strong></span>
          </span>
        {/if}
      </div>
      <p class="need"><ArtIcon name="wood" size={30} />{t('fire.need', { need: village.heatNeed })}</p>
      <p>{t('fire.have', { wood: village.resources.wood })}</p>
      {#if fireCold}
        <p class="reason" role="status">{t('fire.short', { missing: village.heatNeed - village.resources.wood })}</p>
      {/if}
      <p class="muted">{t('fire.text')}</p>
    </div>
  {:else}
    {#if gives}
      <p class="gives">{gives}</p>
    {/if}
    <div class="action">
      {#if phase !== 'action'}
        <p class="muted">{t('action.waitPhase')}</p>
      {:else if !preview}
        <p class="muted">{t('common.loading')}</p>
      {:else if preview.kind === null}
        <p class="muted">{preview.reason && preview.reason !== 'no-action' ? t(`refusal.${preview.reason}`) : t('action.none')}</p>
      {:else}
        <button
          type="button"
          class="btn btn-primary btn-big act"
          disabled={!preview.available || pending}
          aria-label={actionLabel(actionName(preview.kind), preview.yield)}
          aria-describedby={!preview.available && preview.reason ? 'act-reason' : undefined}
          onclick={() => press()}
        >
          {#if pending && pressed === 'main'}
            {t('action.pending')}
          {:else}
            <span class="name">
              {#if preview.kind === 'fish'}<Icon name="ice-hole" size={28} />{/if}
              <span>{actionName(preview.kind)}</span>
            </span>
            <GainChip gain={preview.yield} />
          {/if}
        </button>
        {#if meadowNote}
          <p class="note">{meadowNote}</p>
        {/if}
        {#if !preview.available && preview.reason}
          <p class="reason" id="act-reason" role="status">{t(`refusal.${preview.reason}`)}</p>
        {/if}
      {/if}

      {#if phase === 'action' && alternative}
        <button
          type="button"
          class="btn btn-secondary alt"
          disabled={!alternative.available || pending}
          aria-label={actionLabel(actionName(alternative.kind), alternative.yield)}
          aria-describedby={alternativeReason ? 'demolish-reason' : sharedReason}
          onclick={() => press('demolish')}
        >
          {#if pending && pressed === 'demolish'}
            {t('action.pending')}
          {:else}
            <span class="name">{actionName(alternative.kind)}</span>
            <GainChip gain={alternative.yield} />
          {/if}
        </button>
        <p class="hint">{t('yield.workDone.demolish')}</p>
        {#if alternativeReason}
          <p class="reason" id="demolish-reason" role="status">{t(`refusal.${alternativeReason}`)}</p>
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
  {/if}
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
    width: 48px;
    height: 48px;
    margin: -0.4rem -0.4rem 0 0;
    border: none;
    border-radius: 999px;
    background: var(--card-2);
    font-size: 1.1rem;
    font-weight: 900;
    cursor: pointer;
  }
  .gives {
    margin: 0;
    font-weight: 800;
    color: var(--primary-dark);
  }
  .action {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .action p {
    margin: 0;
  }
  /* The name on top, the pill under it, both from the left (docs/12-selkeys.md §2). */
  .act,
  .alt {
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.3rem;
    text-align: left;
  }
  .act .name {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }
  /* The tear-down is the quieter choice: an outline, a smaller name, no shadow. */
  .alt {
    --pip: var(--warn);
    --pill-bg: var(--card-2);
    --pill-edge: var(--line);
    border-color: var(--warn);
    color: var(--warn);
    font-size: 1rem;
  }
  .alt:hover:not(:disabled) {
    background: var(--warn-soft);
  }
  .hint,
  .note {
    font-weight: 700;
    font-size: 0.92rem;
  }
  .hint {
    color: var(--muted);
  }
  .note {
    padding: 0.35rem 0.6rem;
    border-radius: var(--radius-small);
    background: var(--primary-soft);
    color: var(--primary-dark);
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
    min-height: 48px;
    display: flex;
    align-items: center;
    font-weight: 800;
    color: var(--primary-dark);
    cursor: pointer;
  }
  .more p {
    margin: 0.35rem 0;
  }
  .fire {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }
  .fire p {
    margin: 0;
    font-weight: 700;
  }
  .temps {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .temp {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.35rem 0.8rem 0.35rem 0.45rem;
    border-radius: var(--radius-small);
    background: #eaf4fb;
    border: 2px solid #9cc3dc;
  }
  .temp > span {
    display: flex;
    flex-direction: column;
    line-height: 1.1;
  }
  .temp small {
    font-size: 0.8rem;
    font-weight: 800;
    color: var(--muted);
  }
  .temp strong {
    font-size: 1.6rem;
    font-weight: 900;
    font-variant-numeric: tabular-nums;
  }
  .temp.next {
    background: var(--card-2);
    border-color: var(--line);
  }
  .temp.next strong {
    font-size: 1.25rem;
  }
  .need {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .fire .muted {
    font-weight: 600;
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
