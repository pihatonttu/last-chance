<script lang="ts" module>
  export interface ChartSeries {
    label: string;
    color: string;
    values: readonly number[];
  }

  /** Round tick step (1, 2, 5 × 10^n) giving about `count` ticks over the range. */
  export function niceTicks(min: number, max: number, count = 4): number[] {
    if (max === min) return [min];
    const raw = (max - min) / count;
    const magnitude = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? raw;
    const ticks: number[] = [];
    for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) ticks.push(Math.round(v * 1e6) / 1e6 + 0);
    return ticks;
  }
</script>

<script lang="ts">
  import { formatNumber } from '../../i18n/index.ts';

  /**
   * One small chart on one axis (dataviz: no dual axes; small multiples instead).
   * kind 'line' for levels over time, 'bars' for monthly values (diverging around 0
   * when the values change sign). Each mark has a <title> tooltip.
   */
  interface Props {
    title: string;
    months: readonly number[];
    series: readonly ChartSeries[];
    kind?: 'line' | 'bars';
    /** Colours for negative / positive bars (diverging). */
    negativeColor?: string;
    format?: (value: number) => string;
    yMin?: number;
    yMax?: number;
    reference?: { value: number; label: string } | null;
    monthLabel: (month: number) => string;
  }
  let {
    title,
    months,
    series,
    kind = 'line',
    negativeColor = '#e34948',
    format = formatNumber,
    yMin,
    yMax,
    reference = null,
    monthLabel,
  }: Props = $props();

  const W = 340;
  const H = 170;
  const pad = { top: 12, right: 12, bottom: 24, left: 40 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const all = $derived(series.flatMap((s) => [...s.values]));
  const lo = $derived(Math.min(yMin ?? Infinity, 0, ...all, reference?.value ?? Infinity));
  const hi = $derived(Math.max(yMax ?? -Infinity, ...all, reference?.value ?? -Infinity, lo + 1));
  const ticks = $derived(niceTicks(lo, hi));
  const top = $derived(Math.max(hi, ticks.at(-1) ?? hi));
  const bottom = $derived(Math.min(lo, ticks[0] ?? lo));
  const n = $derived(Math.max(1, months.length));
  const band = $derived(plotW / n);

  function x(i: number): number {
    return pad.left + band * (i + 0.5);
  }
  function y(v: number): number {
    return pad.top + plotH - ((v - bottom) / (top - bottom || 1)) * plotH;
  }
  const labelEvery = $derived(months.length > 10 ? 2 : 1);
</script>

<figure class="chart">
  <figcaption>{title}</figcaption>
  {#if series.length > 1}
    <ul class="legend">
      {#each series as s (s.label)}
        <li><span class="swatch" style:background={s.color}></span>{s.label}</li>
      {/each}
    </ul>
  {/if}
  <svg viewBox="0 0 {W} {H}" role="img" aria-label={title}>
    {#each ticks as tick (tick)}
      <line class="grid" x1={pad.left} x2={W - pad.right} y1={y(tick)} y2={y(tick)} />
      <text class="tick" x={pad.left - 6} y={y(tick)} dy="0.32em" text-anchor="end">{format(tick)}</text>
    {/each}
    {#if bottom < 0 && top > 0}
      <line class="zero" x1={pad.left} x2={W - pad.right} y1={y(0)} y2={y(0)} />
    {/if}
    {#if reference}
      <line class="reference" x1={pad.left} x2={W - pad.right} y1={y(reference.value)} y2={y(reference.value)} />
      <text class="ref-label" x={W - pad.right} y={y(reference.value) - 4} text-anchor="end">{reference.label}</text>
    {/if}
    {#each months as month, i (month)}
      {#if i % labelEvery === 0}
        <text class="tick" x={x(i)} y={H - 6} text-anchor="middle">{month}</text>
      {/if}
    {/each}

    {#if kind === 'bars'}
      {@const s = series[0]}
      {#if s}
        {#each s.values as value, i (i)}
          {@const y0 = y(Math.max(0, Math.min(value, top)))}
          {@const y1 = y(Math.min(0, Math.max(value, bottom)))}
          <rect
            class="mark"
            x={x(i) - Math.min(14, band * 0.6) / 2}
            y={Math.min(y0, y1)}
            width={Math.min(14, band * 0.6)}
            height={Math.max(1.5, Math.abs(y1 - y0))}
            rx="3"
            fill={value < 0 ? negativeColor : s.color}
          >
            <title>{monthLabel(months[i]!)}: {format(value)}</title>
          </rect>
        {/each}
      {/if}
    {:else}
      {#each series as s (s.label)}
        <polyline
          class="line"
          points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
          stroke={s.color}
        />
        {#each s.values as value, i (i)}
          <circle class="dot" cx={x(i)} cy={y(value)} r="4" fill={s.color}>
            <title>{monthLabel(months[i]!)} · {s.label}: {format(value)}</title>
          </circle>
        {/each}
      {/each}
    {/if}
  </svg>
</figure>

<style>
  .chart {
    margin: 0;
    padding: 0.75rem;
    border-radius: var(--radius-small);
    background: #fcfcfb;
    border: 1px solid var(--line);
    break-inside: avoid;
  }
  figcaption {
    font-weight: 800;
    margin-bottom: 0.25rem;
  }
  .legend {
    list-style: none;
    display: flex;
    gap: 0.9rem;
    margin: 0 0 0.25rem;
    padding: 0;
    font-size: 0.85rem;
    color: var(--muted);
    font-weight: 700;
  }
  .legend li {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }
  .swatch {
    width: 14px;
    height: 4px;
    border-radius: 2px;
  }
  svg {
    width: 100%;
    height: auto;
    display: block;
    overflow: visible;
  }
  .grid {
    stroke: #e7e3dc;
    stroke-width: 1;
  }
  .zero {
    stroke: #8a8780;
    stroke-width: 1;
  }
  .reference {
    stroke: #52514e;
    stroke-width: 1;
  }
  .ref-label {
    font-size: 10px;
    fill: #52514e;
    font-weight: 700;
  }
  .tick {
    font-size: 10px;
    fill: #52514e;
    font-variant-numeric: tabular-nums;
  }
  .line {
    fill: none;
    stroke-width: 2;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
  .dot {
    stroke: #fcfcfb;
    stroke-width: 2;
  }
  .dot:hover,
  .mark:hover {
    opacity: 0.8;
  }
</style>
