<script lang="ts">
  import type { GameLength } from '@saari/rules';
  import Footer from '../components/Footer.svelte';
  import { t } from '../i18n/index.ts';
  import { createGame } from '../net/api.ts';
  import { tokens } from '../net/storage.ts';
  import { href, router } from '../router.svelte.ts';

  type ActionSeconds = 45 | 60 | 90;

  let length: GameLength = $state('normal');
  let actionSeconds: ActionSeconds = $state(60);
  let trial = $state(false);
  let busy = $state(false);
  let error = $state('');

  const lengths: { value: GameLength; label: string; hint: string }[] = [
    { value: 'normal', label: t('create.length.normal'), hint: t('create.length.normalHint') },
    { value: 'short', label: t('create.length.short'), hint: t('create.length.shortHint') },
  ];
  const durations: ActionSeconds[] = [45, 60, 90];

  async function submit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    busy = true;
    error = '';
    try {
      const created = await createGame({ length, actionSeconds, trial });
      tokens.setHost(created.code, created.hostToken);
      router.navigate(`/host/${created.code}`);
    } catch {
      error = t('create.error');
    } finally {
      busy = false;
    }
  }
</script>

<main class="page">
  <a class="btn btn-secondary btn-small" href={href('/')} onclick={router.link}>← {t('common.back')}</a>
  <form class="card create" onsubmit={submit}>
    <h1>{t('create.title')}</h1>
    <p class="muted">{t('create.intro')}</p>

    <fieldset>
      <legend>{t('create.length.legend')}</legend>
      <div class="options">
        {#each lengths as option (option.value)}
          <label class="option" class:checked={length === option.value}>
            <input type="radio" name="length" value={option.value} bind:group={length} />
            <span class="option-title">{option.label}</span>
            <span class="option-hint">{option.hint}</span>
          </label>
        {/each}
      </div>
    </fieldset>

    <fieldset>
      <legend>{t('create.action.legend')}</legend>
      <div class="options segmented">
        {#each durations as seconds (seconds)}
          <label class="option" class:checked={actionSeconds === seconds}>
            <input type="radio" name="action" value={seconds} bind:group={actionSeconds} />
            <span class="option-title">{t('common.seconds', { n: seconds })}</span>
          </label>
        {/each}
      </div>
      <p class="muted hint">{t('create.action.hint')}</p>
    </fieldset>

    <label class="trial" class:checked={trial}>
      <input type="checkbox" bind:checked={trial} />
      <span>
        <span class="option-title">{t('create.trial.label')}</span>
        <span class="option-hint">{t('create.trial.hint')}</span>
      </span>
    </label>

    {#if error}
      <p class="error" role="alert">{error}</p>
    {/if}
    <button class="btn btn-primary btn-big" type="submit" disabled={busy}>
      {busy ? t('create.creating') : t('create.submit')}
    </button>
  </form>
</main>
<Footer />

<style>
  .create {
    margin-top: 1rem;
    max-width: 44rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
  .create h1 {
    margin: 0;
  }
  fieldset {
    border: none;
    margin: 0;
    padding: 0;
  }
  legend {
    font-weight: 800;
    font-size: 1.1rem;
    margin-bottom: 0.5rem;
  }
  .options {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.75rem;
  }
  .segmented {
    grid-template-columns: repeat(3, 1fr);
  }
  .option,
  .trial {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-height: 64px;
    padding: 0.75rem 1rem;
    border: 2px solid var(--line);
    border-radius: 12px;
    background: var(--card-2);
    cursor: pointer;
  }
  .option.checked,
  .trial.checked {
    border-color: var(--primary);
    background: var(--primary-soft);
    box-shadow: inset 0 0 0 1px var(--primary);
  }
  .option input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
  .option:has(input:focus-visible) {
    outline: 4px solid var(--focus);
    outline-offset: 2px;
  }
  .option-title {
    font-weight: 800;
    font-size: 1.1rem;
  }
  .option-hint {
    color: var(--muted);
    display: block;
  }
  .segmented .option {
    align-items: center;
    justify-content: center;
  }
  .trial {
    flex-direction: row;
    align-items: flex-start;
    gap: 0.75rem;
  }
  .trial input {
    width: 28px;
    height: 28px;
    margin: 0.15rem 0 0;
    accent-color: var(--primary);
    flex: none;
  }
  .hint {
    margin: 0.5rem 0 0;
  }
  .error {
    color: var(--danger);
    font-weight: 700;
    margin: 0;
  }
</style>
