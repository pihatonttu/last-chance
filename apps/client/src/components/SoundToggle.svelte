<script lang="ts">
  import type { SoundService } from '../audio/sound.svelte.ts';
  import Icon from './Icon.svelte';

  interface Props {
    sound: SoundService;
    onLabel: string;
    offLabel: string;
    /** Icon only; the label stays for screen readers and as a tooltip. */
    compact?: boolean;
  }
  let { sound, onLabel, offLabel, compact = false }: Props = $props();
</script>

<button
  type="button"
  class="btn btn-secondary btn-small sound"
  aria-pressed={!sound.muted}
  onclick={() => sound.toggle()}
  title={sound.muted ? offLabel : onLabel}
>
  <Icon name={sound.muted ? 'mute' : 'sound'} />
  <span class:visually-hidden={compact}>{sound.muted ? offLabel : onLabel}</span>
</button>
