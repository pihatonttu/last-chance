<script lang="ts">
  import type { DebriefData } from '@saari/debrief';
  import Debrief from '../components/debrief/Debrief.svelte';
  import DebriefTools from '../components/debrief/DebriefTools.svelte';
  import Footer from '../components/Footer.svelte';
  import { t } from '../i18n/index.ts';
  import { fetchDebrief } from '../net/api.ts';
  import { href, router } from '../router.svelte.ts';

  /** The stored, pseudonymised debrief behind the private link (P14, P23). */
  let { token }: { token: string } = $props();

  let status = $state<'loading' | 'ready' | 'missing' | 'error'>('loading');
  let debrief = $state<DebriefData | null>(null);

  $effect(() => {
    let cancelled = false;
    status = 'loading';
    fetchDebrief(token)
      .then((data) => {
        if (cancelled) return;
        debrief = data;
        status = data ? 'ready' : 'missing';
      })
      .catch(() => {
        if (!cancelled) status = 'error';
      });
    return () => {
      cancelled = true;
    };
  });
</script>

<main class="page">
  <a class="btn btn-secondary btn-small no-print" href={href('/')} onclick={router.link}>← {t('common.home')}</a>
  {#if status === 'loading'}
    <p class="card status">{t('common.loading')}</p>
  {:else if status === 'missing'}
    <p class="card status">{t('debrief.notFound')}</p>
  {:else if status === 'error'}
    <p class="card status" role="alert">{t('debrief.loadError')}</p>
  {:else if debrief}
    <div class="stack">
      <DebriefTools storedToken={token} />
      <Debrief {debrief} />
    </div>
  {/if}
</main>
<Footer />

<style>
  .status {
    margin-top: 1rem;
  }
  .stack {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-top: 1rem;
  }
</style>
