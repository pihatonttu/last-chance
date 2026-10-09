<script lang="ts">
  let { size = 120 }: { size?: number } = $props();
</script>

<svg class="island-art" width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
  <circle cx="60" cy="60" r="58" fill="#2f78a3" />
  <path d="M14 74 C 30 52, 90 50, 106 74 C 92 92, 28 92, 14 74 Z" fill="#e9d29c" />
  <path d="M24 72 C 38 58, 84 56, 96 72 C 84 82, 36 84, 24 72 Z" fill="#9ccc65" />
  <rect x="57" y="40" width="5" height="28" rx="2" fill="#6d4c41" />
  <path d="M59 42 C 46 30, 32 36, 28 44 C 40 38, 50 40, 59 42 Z" fill="#2e7d32" />
  <path d="M60 42 C 72 28, 88 32, 92 42 C 80 36, 70 38, 60 42 Z" fill="#43a047" />
  <path d="M59 41 C 56 28, 62 20, 70 18 C 64 26, 62 32, 59 41 Z" fill="#388e3c" />
  <path d="M38 70 l 10 -12 l 10 12 z" fill="#d9534f" />
  <path d="M84 96 q 6 -4 12 0 M 20 98 q 6 -4 12 0" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.6" />
</svg>

<style>
  .island-art {
    flex: none;
    filter: drop-shadow(0 4px 10px rgb(0 0 0 / 0.15));
  }
</style>
