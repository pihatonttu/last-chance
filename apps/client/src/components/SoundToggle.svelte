<script lang="ts">
  import type { SoundService } from '../audio/sound.svelte.ts';
  import Icon from './Icon.svelte';

  let { sound, onLabel, offLabel }: { sound: SoundService; onLabel: string; offLabel: string } = $props();
</script>

<button
  type="button"
  class="btn btn-secondary btn-small sound"
  aria-pressed={!sound.muted}
  onclick={() => sound.toggle()}
  title={sound.muted ? offLabel : onLabel}
>
  <Icon name={sound.muted ? 'mute' : 'sound'} />
  <span>{sound.muted ? offLabel : onLabel}</span>
</button>
