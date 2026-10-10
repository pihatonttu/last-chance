<script lang="ts">
  import type { GameView } from '@saari/protocol';
  import { formatNumber, t } from '../i18n/index.ts';
  import ArtIcon from './ArtIcon.svelte';
  import Icon from './Icon.svelte';
  import MoodFace from './MoodFace.svelte';
  import PhaseClock from './PhaseClock.svelte';

  /**
   * Laid out like the original game's HUD: the village's shared stock on the left (a
   * picture and a number each, words only for screen readers and tooltips), the clock in
   * the middle, the month and the village's mood on the right.
   */
  interface Props {
    game: GameView;
    clockOffset: number;
    phaseTotalMs: number;
    size?: 'projector' | 'student';
  }
  let { game, clockOffset, phaseTotalMs, size = 'student' }: Props = $props();

  const village = $derived(game.village);
  const short = $derived(village.resources.food < village.foodNeed);
  const sheltered = $derived(village.shelterCapacity >= village.villagers);
  const mood = $derived(game.lastReport?.mood.total ?? 0);
  const icon = $derived(size === 'projector' ? 44 : 32);
</script>

<header class="hud {size}">
  <div class="resources" role="group" aria-label={t('bar.resources')}>
    <div class="cell" title={t('bar.wood')}>
      <ArtIcon name="wood" size={icon} />
      <span class="visually-hidden">{t('bar.wood')}</span>
      <span class="value">{formatNumber(village.resources.wood)}</span>
    </div>
    <div class="cell" title={t('bar.stone')}>
      <ArtIcon name="stone" size={icon} />
      <span class="visually-hidden">{t('bar.stone')}</span>
      <span class="value">{formatNumber(village.resources.stone)}</span>
    </div>
    <div class="cell" class:short title="{t('bar.food')} · {t('bar.storage', { max: village.foodStorage })}">
      <ArtIcon name="food" size={icon} />
      <span class="visually-hidden">{t('bar.food')}: {t('bar.foodValue', { food: village.resources.food, need: village.foodNeed })}</span>
      <span class="value" aria-hidden="true">{formatNumber(village.resources.food)}<span class="of">/{formatNumber(village.foodNeed)}</span></span>
    </div>
    <div class="cell" class:short={!sheltered} title={t('bar.shelter')}>
      <ArtIcon name="shelter" size={icon} />
      <span class="visually-hidden">{t('bar.shelter')}</span>
      <span class="value">{t('bar.shelterValue', { capacity: village.shelterCapacity, villagers: village.villagers })}</span>
    </div>
  </div>
  <div class="clock">
    <PhaseClock phase={game.phase} timer={game.timer} {clockOffset} totalMs={phaseTotalMs} size={size === 'projector' ? 72 : 50} />
  </div>
  <div class="right">
    <div class="pill" title={t('bar.month')}>
      <Icon name="calendar" size={size === 'projector' ? 30 : 22} />
      <span class="visually-hidden">{t('bar.month')}</span>
      <span class="value">{t('bar.monthValue', { month: game.month, total: game.totalMonths })}</span>
    </div>
    <div class="pill" title={t('bar.happiness')}>
      <MoodFace {mood} size={icon - 4} />
      <span class="visually-hidden">{t('bar.happiness')}</span>
      <span class="value">{formatNumber(village.happiness)}</span>
    </div>
  </div>
</header>

<style>
  .hud {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 0.4rem 0.75rem;
    padding: 0.35rem 0.6rem;
    background: var(--card);
    border-bottom: 3px solid var(--line);
  }
  .resources {
    justify-self: start;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem;
    padding: 0.2rem 0.35rem;
    border-radius: 999px;
    background: var(--card-2);
    border: 2px solid var(--line);
  }
  .cell {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.1rem 0.55rem 0.1rem 0.25rem;
    border-radius: 999px;
    min-height: 40px;
  }
  .value {
    font-weight: 900;
    font-size: 1.15em;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .of {
    font-size: 0.75em;
    font-weight: 800;
    color: var(--muted);
  }
  .short {
    background: var(--danger-soft);
  }
  .short .value,
  .short .of {
    color: var(--danger);
  }
  .clock {
    justify-self: center;
  }
  .right {
    justify-self: end;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    min-height: 40px;
    padding: 0.15rem 0.7rem 0.15rem 0.4rem;
    border-radius: 999px;
    background: var(--card-2);
    border: 2px solid var(--line);
  }
  @media (max-width: 760px) {
    .hud {
      grid-template-columns: 1fr auto;
    }
    .resources {
      grid-column: 1 / -1;
      justify-self: stretch;
      justify-content: space-between;
      flex-wrap: nowrap;
      gap: 0;
    }
    .cell {
      gap: 0.15rem;
      padding: 0 0.3rem 0 0.1rem;
    }
    .cell :global(.art-icon) {
      width: 26px;
      height: 26px;
    }
    .value {
      font-size: 1em;
    }
    .clock {
      justify-self: start;
    }
  }
  .student {
    font-size: 15px;
  }
  .projector {
    font-size: clamp(18px, 1.45vw, 30px);
    gap: 0.5rem 1rem;
    padding: 0.5rem 1rem;
  }
  .projector .cell {
    padding-right: 0.8rem;
    min-height: 56px;
  }
</style>
