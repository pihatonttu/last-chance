<script lang="ts">
  import { t } from '../i18n/index.ts';

  /** Mood of the last month (design doc §9: about −20 … +15). */
  let { mood, size = 34 }: { mood: number; size?: number } = $props();

  const kind = $derived(mood >= 3 ? 'good' : mood >= 0 ? 'ok' : 'bad');
  const fill = $derived(kind === 'good' ? '#ffd166' : kind === 'ok' ? '#ffe8a3' : '#f4b4a4');
  const mouth = $derived(
    kind === 'good' ? 'M8 14 Q12 18.5 16 14' : kind === 'ok' ? 'M8.5 15 H15.5' : 'M8 16.5 Q12 12.5 16 16.5',
  );
</script>

<svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={t(`mood.${kind}`)}>
  <circle cx="12" cy="12" r="10.5" fill={fill} stroke="#1d2a33" stroke-width="1.5" />
  <circle cx="8.5" cy="9.5" r="1.4" fill="#1d2a33" />
  <circle cx="15.5" cy="9.5" r="1.4" fill="#1d2a33" />
  <path d={mouth} stroke="#1d2a33" stroke-width="1.7" fill="none" stroke-linecap="round" />
</svg>
