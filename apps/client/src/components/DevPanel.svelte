<script lang="ts">
  import { onMount } from 'svelte';
  import type { MockServer } from '../net/mock/server.ts';
  import { t } from '../i18n/index.ts';

  /** Demo controls for ?mock=1, shown only in the tab that runs the game. */
  let { code }: { code: string } = $props();

  let server: MockServer | null = $state(null);
  let info = $state<{ phase: string; month: number } | null>(null);
  let speed = $state(1);
  let open = $state(true);

  onMount(() => {
    let stopped = false;
    void import('../net/mock/hub.ts').then(({ getMockServer }) => {
      if (stopped) return;
      server = getMockServer();
      speed = server.speed;
    });
    const timer = setInterval(() => {
      info = server?.hasRoom(code) ? server.phaseOf(code) : null;
    }, 300);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  });

  function cycleSpeed(): void {
    const next = speed === 1 ? 3 : speed === 3 ? 10 : 1;
    server?.setSpeed(next);
    speed = next;
  }
</script>

{#if info && info.phase !== 'ended'}
  <aside class="dev no-print" aria-label={t('dev.title')}>
    <button type="button" class="toggle" aria-expanded={open} onclick={() => (open = !open)}>{t('dev.title')}</button>
    {#if open}
      <span class="phase">{t('dev.phase', { phase: info.phase, month: info.month })}</span>
      <button type="button" class="btn btn-secondary btn-small" onclick={() => server?.skipPhase(code)}>{t('dev.skip')}</button>
      <button type="button" class="btn btn-secondary btn-small" onclick={cycleSpeed}>{t('dev.speed', { n: speed })}</button>
      <button type="button" class="btn btn-secondary btn-small" onclick={() => server?.addBots(code, 5)}>{t('dev.addBots')}</button>
    {/if}
  </aside>
{/if}

<style>
  .dev {
    position: fixed;
    left: 0.5rem;
    bottom: 4.75rem;
    z-index: 50;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-wrap: wrap;
    max-width: calc(100vw - 1rem);
    padding: 0.35rem 0.5rem;
    border: 2px dashed var(--warn);
    border-radius: var(--radius-small);
    background: rgb(255 241 214 / 0.95);
    font-size: 0.85rem;
  }
  .toggle {
    min-height: 44px;
    border: none;
    background: none;
    font-weight: 900;
    color: var(--warn);
    cursor: pointer;
  }
  .phase {
    font-weight: 700;
  }
</style>
