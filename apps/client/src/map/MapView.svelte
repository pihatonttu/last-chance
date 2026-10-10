<script lang="ts">
  import { onMount } from 'svelte';
  import type { MapView } from '@saari/protocol';
  import type { Coord } from '@saari/rules';
  import { t } from '../i18n/index.ts';
  import type { FloatingEffect } from '../state/reducer.ts';
  import { art } from './art-style.svelte.ts';
  import type { MapMode, MapRenderer } from './renderer.ts';

  interface Props {
    map: MapView;
    villagers: number;
    mode: MapMode;
    selected?: Coord | null;
    effects?: readonly FloatingEffect[];
    onselect?: (x: number, y: number) => void;
    label: string;
  }

  let { map, villagers, mode, selected = null, effects = [], onselect, label }: Props = $props();

  let host: HTMLDivElement;
  let renderer: MapRenderer | null = $state(null);
  let failed = $state(false);
  let moved = $state(false);
  const shown = new Set<number>();

  const reducedMotion =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  onMount(() => {
    let cancelled = false;
    let created: MapRenderer | null = null;
    import('./renderer.ts')
      .then(({ MapRenderer }) =>
        MapRenderer.create(host, {
          mode,
          reducedMotion,
          artStyle: art.style,
          onTap: (x, y) => onselect?.(x, y),
          onCameraMoved: (value) => (moved = value),
        }),
      )
      .then((r) => {
        created = r;
        if (cancelled) r.destroy();
        else renderer = r;
      })
      .catch(() => (failed = true));
    return () => {
      cancelled = true;
      created?.destroy();
      renderer = null;
    };
  });

  $effect(() => {
    renderer?.update(map, villagers);
  });

  $effect(() => {
    renderer?.setSelected(selected);
  });

  $effect(() => {
    void renderer?.setArtStyle(art.style);
  });

  $effect(() => {
    const r = renderer;
    if (!r) return;
    for (const effect of effects) {
      if (shown.has(effect.id)) continue;
      shown.add(effect.id);
      r.showEffect(effect.x, effect.y, effect.gain);
    }
  });

  /** Arrow keys move the selection; + / − zoom. Keeps the map usable without a pointer. */
  function onkeydown(event: KeyboardEvent): void {
    if (mode !== 'student') return;
    const steps: Record<string, [number, number]> = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
    };
    const step = steps[event.key];
    if (step) {
      event.preventDefault();
      const from = selected ?? map.landing;
      const x = Math.min(map.width - 1, Math.max(0, from.x + step[0]));
      const y = Math.min(map.height - 1, Math.max(0, from.y + step[1]));
      onselect?.(x, y);
    } else if (event.key === '+' || event.key === '=') renderer?.zoom(1.25);
    else if (event.key === '-') renderer?.zoom(0.8);
  }
</script>

<div class="map {mode}">
  <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
  <div
    class="canvas-host"
    bind:this={host}
    role="application"
    aria-label={label}
    tabindex={mode === 'student' ? 0 : -1}
    {onkeydown}
  ></div>
  {#if failed}
    <p class="fallback">{t('map.unavailable')}</p>
  {/if}
  {#if mode === 'student' && moved}
    <button type="button" class="recenter" onclick={() => renderer?.fit()}>{t('play.recenter')}</button>
  {/if}
</div>

<style>
  .map {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    background: radial-gradient(ellipse at center, var(--map-sea-light) 0%, var(--map-sea) 70%);
  }
  .canvas-host {
    position: absolute;
    inset: 0;
    outline: none;
  }
  .canvas-host:focus-visible {
    box-shadow: inset 0 0 0 4px var(--focus);
  }
  .fallback {
    position: absolute;
    inset: auto 1rem 1rem;
    margin: 0;
    padding: 0.75rem 1rem;
    border-radius: var(--radius);
    background: var(--card);
    color: var(--ink);
  }
  .recenter {
    position: absolute;
    right: 0.75rem;
    bottom: 0.75rem;
    min-height: 44px;
    padding: 0 1rem;
    border: 2px solid var(--ink);
    border-radius: 999px;
    background: var(--card);
    color: var(--ink);
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }
</style>
