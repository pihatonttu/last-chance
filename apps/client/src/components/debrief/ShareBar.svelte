<script lang="ts" module>
  export interface ShareSegment {
    key: string;
    label: string;
    color: string;
    value: number;
  }
</script>

<script lang="ts">
  /** One 100 % stacked bar with 2 px gaps between segments; each segment has a tooltip. */
  let { segments, label, height = 18 }: { segments: readonly ShareSegment[]; label: string; height?: number } = $props();

  const total = $derived(segments.reduce((sum, s) => sum + s.value, 0));
  const visible = $derived(segments.filter((s) => s.value > 0));
</script>

<div class="share" role="img" aria-label={label} style:height="{height}px">
  {#each visible as segment (segment.key)}
    <span
      class="segment"
      style:flex-grow={segment.value}
      style:background={segment.color}
      title="{segment.label}: {segment.value} ({Math.round((segment.value / total) * 100)} %)"
    ></span>
  {/each}
</div>

<style>
  .share {
    display: flex;
    gap: 2px;
    width: 100%;
    border-radius: 4px;
    overflow: hidden;
    background: #fcfcfb;
  }
  .segment {
    flex-basis: 0;
    min-width: 2px;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
</style>
