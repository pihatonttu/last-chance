<script lang="ts">
  let { message, tone = 'warn' }: { message: string; tone?: 'warn' | 'error' | 'info' } = $props();
</script>

<div class="banner {tone}" role="status" aria-live="polite">{message}</div>

<style>
  .banner {
    padding: 0.6rem 1rem;
    font-weight: 800;
    text-align: center;
  }
  .warn {
    background: var(--warn-soft);
    color: var(--warn);
    border-bottom: 2px solid var(--gold);
  }
  .error {
    background: var(--danger-soft);
    color: var(--danger);
    border-bottom: 2px solid var(--danger);
  }
  .info {
    background: var(--primary-soft);
    color: var(--primary-dark);
  }
</style>
