<script lang="ts">
  import { t } from './i18n/index.ts';
  import { isMock } from './net/mode.ts';
  import { router } from './router.svelte.ts';
  import Create from './views/Create.svelte';
  import DebriefPage from './views/DebriefPage.svelte';
  import Help from './views/Help.svelte';
  import Home from './views/Home.svelte';
  import Host from './views/Host.svelte';
  import NotFound from './views/NotFound.svelte';
  import Play from './views/Play.svelte';
  import Privacy from './views/Privacy.svelte';

  const route = $derived(router.route);
  const mock = isMock();
  const inGame = $derived(route.name === 'host' || route.name === 'play');

  $effect(() => {
    document.title = t('app.name');
  });
</script>

{#if mock && !inGame}
  <div class="mock-banner no-print" role="note">{t('app.mockBanner')}</div>
{/if}

{#if route.name === 'home'}
  <Home initialCode={route.code} />
{:else if route.name === 'create'}
  <Create />
{:else if route.name === 'host'}
  {#key route.code}
    <Host code={route.code} />
  {/key}
{:else if route.name === 'play'}
  {#key route.code}
    <Play code={route.code} />
  {/key}
{:else if route.name === 'debrief'}
  <DebriefPage token={route.token} />
{:else if route.name === 'privacy'}
  <Privacy />
{:else if route.name === 'help'}
  <Help />
{:else}
  <NotFound />
{/if}

<style>
  .mock-banner {
    padding: 0.4rem 1rem;
    background: var(--warn-soft);
    color: var(--warn);
    font-weight: 700;
    text-align: center;
    border-bottom: 2px solid var(--gold);
  }
</style>
