<script lang="ts" module>
  export type IconName = 'wood' | 'stone' | 'food' | 'shelter' | 'calendar' | 'clock' | 'people' | 'sound' | 'mute' | 'heart';
</script>

<script lang="ts">
  let { name, size = 22 }: { name: IconName; size?: number } = $props();
</script>

<svg class="icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  {#if name === 'wood'}
    <rect x="2" y="7" width="17" height="10" rx="5" fill="#a0673a" />
    <ellipse cx="18" cy="12" rx="4" ry="5" fill="#e3b77a" stroke="#7a4b24" stroke-width="1.5" />
    <circle cx="18" cy="12" r="1.6" fill="#a0673a" />
  {:else if name === 'stone'}
    <path d="M3 17 L6 9 L12 5 L19 8 L21 16 L15 20 L7 20 Z" fill="#8f9aa1" stroke="#4f5b62" stroke-width="1.5" stroke-linejoin="round" />
    <path d="M6 9 L12 5 L14 10 L8 12 Z" fill="#c6cdd1" />
  {:else if name === 'food'}
    <path d="M12 7 C 7 4, 3 8, 4 13 C 5 19, 9 21, 12 19 C 15 21, 19 19, 20 13 C 21 8, 17 4, 12 7 Z" fill="#e2603b" />
    <path d="M12 7 C 12 4, 14 2, 16 2 C 15 4, 14 5, 12 7 Z" fill="#3f8f3f" />
  {:else if name === 'shelter'}
    <path d="M2 12 L12 3 L22 12 L19 12 L19 21 L5 21 L5 12 Z" fill="#d9534f" />
    <rect x="10" y="14" width="4" height="7" fill="#fff" />
  {:else if name === 'calendar'}
    <rect x="3" y="5" width="18" height="16" rx="3" fill="#fff" stroke="currentColor" stroke-width="2" />
    <path d="M3 10 H21" stroke="currentColor" stroke-width="2" />
    <path d="M8 3 V7 M16 3 V7" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
  {:else if name === 'clock'}
    <circle cx="12" cy="12" r="9" fill="#fff" stroke="currentColor" stroke-width="2" />
    <path d="M12 7 V12 L15 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" />
  {:else if name === 'people'}
    <circle cx="8" cy="8" r="3.5" fill="currentColor" />
    <circle cx="16.5" cy="9" r="3" fill="currentColor" opacity="0.7" />
    <path d="M2 20 C 2 15, 14 15, 14 20 Z" fill="currentColor" />
    <path d="M12 20 C 12 16, 22 16, 22 20 Z" fill="currentColor" opacity="0.7" />
  {:else if name === 'sound'}
    <path d="M3 9 H7 L12 5 V19 L7 15 H3 Z" fill="currentColor" />
    <path d="M15 8 C 17 10, 17 14, 15 16 M18 5 C 22 9, 22 15, 18 19" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" />
  {:else if name === 'mute'}
    <path d="M3 9 H7 L12 5 V19 L7 15 H3 Z" fill="currentColor" />
    <path d="M16 9 L21 15 M21 9 L16 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
  {:else if name === 'heart'}
    <path d="M12 20 C 4 14, 2 10, 4 7 C 6 4, 10 4, 12 7 C 14 4, 18 4, 20 7 C 22 10, 20 14, 12 20 Z" fill="#e5484d" />
  {/if}
</svg>

<style>
  .icon {
    flex: none;
    vertical-align: middle;
  }
</style>
