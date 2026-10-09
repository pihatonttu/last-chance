<script lang="ts">
  import type { Snippet } from 'svelte';
  import Footer from '../components/Footer.svelte';
  import { t } from '../i18n/index.ts';
  import { href, router } from '../router.svelte.ts';

  let { title, children }: { title: string; children: Snippet } = $props();
</script>

<main class="page">
  <a class="btn btn-secondary btn-small" href={href('/')} onclick={router.link}>← {t('common.home')}</a>
  <article class="card static">
    <h1>{title}</h1>
    {@render children()}
  </article>
</main>
<Footer />

<style>
  .static {
    margin-top: 1rem;
    max-width: 46rem;
  }
  .static :global(li) {
    margin-bottom: 0.5rem;
  }
</style>
