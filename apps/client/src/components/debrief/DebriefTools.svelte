<script lang="ts">
  import { t } from '../../i18n/index.ts';
  import { deleteDebrief } from '../../net/api.ts';
  import { href } from '../../router.svelte.ts';

  /** Print, link to the stored pseudonymised copy, and delete it (P14, P23). */
  let { storedToken, trial = false }: { storedToken: string | null; trial?: boolean } = $props();

  let deleted = $state(false);
  let failed = $state(false);
  let copied = $state(false);
  const link = $derived(storedToken ? `${location.origin}${href(`/debrief/${storedToken}`)}` : '');

  async function remove(): Promise<void> {
    if (!storedToken || !confirm(t('debrief.deleteConfirm'))) return;
    failed = false;
    try {
      await deleteDebrief(storedToken);
      deleted = true;
    } catch {
      failed = true;
    }
  }

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(link);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch {
      copied = false;
    }
  }
</script>

<div class="tools no-print">
  <button type="button" class="btn btn-primary" onclick={() => print()}>{t('debrief.print')}</button>
  {#if storedToken && !deleted}
    <div class="stored">
      <span>{t('debrief.stored')}</span>
      <a href={link} target="_blank" rel="noopener">{link}</a>
      <span class="row">
        <button type="button" class="btn btn-secondary btn-small" onclick={copy}>
          {copied ? t('common.copied') : t('common.copy')}
        </button>
        <button type="button" class="btn btn-danger btn-small" onclick={remove}>{t('debrief.delete')}</button>
      </span>
      {#if failed}<span class="error" role="alert">{t('debrief.deleteError')}</span>{/if}
    </div>
  {:else if deleted}
    <p class="ok" role="status">{t('debrief.deleted')}</p>
  {:else if trial}
    <p class="muted">{t('debrief.notStored')}</p>
  {/if}
</div>

<style>
  .tools {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 1rem;
    padding: 1rem;
    border-radius: var(--radius);
    background: var(--card);
    box-shadow: var(--shadow);
  }
  .stored {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    min-width: 0;
    flex: 1;
  }
  .stored a {
    word-break: break-all;
    font-weight: 700;
  }
  .row {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .ok {
    color: var(--ok);
    font-weight: 800;
    margin: 0;
  }
  .error {
    color: var(--danger);
    font-weight: 700;
  }
</style>
