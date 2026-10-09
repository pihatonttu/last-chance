<script lang="ts">
  import type { GameView } from '@saari/protocol';
  import { formatNumber, t } from '../i18n/index.ts';
  import Icon from './Icon.svelte';
  import MoodFace from './MoodFace.svelte';
  import PhaseTimer from './PhaseTimer.svelte';

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
</script>

<header class="topbar {size}">
  <div class="stat" title={t('bar.wood')}>
    <Icon name="wood" />
    <span class="label">{t('bar.wood')}</span>
    <span class="value">{formatNumber(village.resources.wood)}</span>
  </div>
  <div class="stat" title={t('bar.stone')}>
    <Icon name="stone" />
    <span class="label">{t('bar.stone')}</span>
    <span class="value">{formatNumber(village.resources.stone)}</span>
  </div>
  <div class="stat food" class:short title={t('bar.storage', { max: village.foodStorage })}>
    <Icon name="food" />
    <span class="label">{t('bar.food')}</span>
    <span class="value">{t('bar.foodValue', { food: village.resources.food, need: village.foodNeed })}</span>
    <span class="sub">{t('bar.storage', { max: village.foodStorage })}</span>
  </div>
  <div class="stat" class:short={!sheltered}>
    <Icon name="shelter" />
    <span class="label">{t('bar.shelter')}</span>
    <span class="value">{t('bar.shelterValue', { capacity: village.shelterCapacity, villagers: village.villagers })}</span>
  </div>
  <div class="stat">
    <MoodFace {mood} size={size === 'projector' ? 40 : 30} />
    <span class="label">{t('bar.happiness')}</span>
    <span class="value">{formatNumber(village.happiness)}</span>
  </div>
  <div class="stat">
    <Icon name="calendar" />
    <span class="label">{t('bar.month')}</span>
    <span class="value">{t('bar.monthValue', { month: game.month, total: game.totalMonths })}</span>
  </div>
  <div class="stat timer-stat">
    <PhaseTimer phase={game.phase} timer={game.timer} {clockOffset} totalMs={phaseTotalMs} />
  </div>
</header>

<style>
  .topbar {
    display: flex;
    flex-wrap: wrap;
    align-items: stretch;
    gap: 0.35rem 0.5rem;
    padding: 0.4rem 0.6rem;
    background: var(--card);
    border-bottom: 3px solid var(--line);
  }
  .stat {
    display: grid;
    grid-template-columns: auto auto;
    grid-template-rows: auto auto;
    column-gap: 0.4rem;
    align-items: center;
    padding: 0.15rem 0.5rem;
    border-radius: var(--radius-small);
    background: var(--card-2);
    min-height: 44px;
  }
  .stat > :global(svg) {
    grid-row: 1 / span 2;
  }
  .label {
    font-size: 0.72em;
    font-weight: 700;
    color: var(--muted);
    line-height: 1.1;
  }
  .value {
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    line-height: 1.15;
    white-space: nowrap;
  }
  .sub {
    display: none;
  }
  .short {
    background: var(--danger-soft);
  }
  .short .value {
    color: var(--danger);
  }
  .timer-stat {
    display: block;
    flex: 1 1 10em;
    margin-left: auto;
  }
  .projector {
    font-size: clamp(18px, 1.45vw, 30px);
    gap: 0.5rem 0.8rem;
    padding: 0.6rem 1rem;
  }
  .projector .stat {
    padding: 0.3rem 0.8rem;
  }
  .projector .sub {
    display: block;
    grid-column: 2;
    font-size: 0.65em;
    color: var(--muted);
    font-weight: 700;
  }
  .projector .stat:has(.sub) {
    grid-template-rows: auto auto auto;
  }
  .projector .stat:has(.sub) > :global(svg) {
    grid-row: 1 / span 3;
  }
  .student {
    font-size: 15px;
  }
</style>
