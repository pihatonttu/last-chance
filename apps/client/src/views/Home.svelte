<script lang="ts">
  import Footer from '../components/Footer.svelte';
  import { t } from '../i18n/index.ts';
  import { isGameCode, normalizeCode } from '../lib/routes.ts';
  import { createGame, gameStatus } from '../net/api.ts';
  import { isMock } from '../net/mode.ts';
  import { tokens } from '../net/storage.ts';
  import { href, router } from '../router.svelte.ts';

  let { initialCode = null }: { initialCode?: string | null } = $props();

  let code = $state('');
  let error = $state('');
  let checking = $state(false);
  const mock = isMock();

  $effect.pre(() => {
    if (initialCode && code === '') code = initialCode;
  });

  async function join(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const clean = normalizeCode(code);
    code = clean;
    if (!isGameCode(clean)) {
      error = t('home.join.invalidCode');
      return;
    }
    error = '';
    checking = true;
    try {
      const status = await gameStatus(clean);
      const returning = tokens.player(clean) !== null;
      if (!status) error = t('home.join.notFound');
      else if (status.phase === 'ended') error = t('home.join.ended');
      else if (!status.joinOpen && !returning) error = t('home.join.closed');
      else router.navigate(`/play/${clean}`);
    } catch {
      error = t('home.join.networkError');
    } finally {
      checking = false;
    }
  }

  async function demoHost(): Promise<void> {
    const created = await createGame({ length: 'short', actionSeconds: 45, trial: false });
    tokens.setHost(created.code, created.hostToken);
    router.navigate(`/host/${created.code}`);
  }

  function demoPlay(): void {
    router.navigate(`/play/${String(100000 + Math.floor(Math.random() * 900000))}`);
  }
</script>

<main class="page home">
  <header class="hero">
    <div>
      <h1>{t('app.name')}</h1>
      <p class="tagline">{t('app.tagline')}</p>
    </div>
    <img class="hero-art" src="{import.meta.env.BASE_URL}art/kenney/hero.png" alt="" width="640" height="363" />
  </header>

  <div class="choices">
    <!-- Most visitors are pupils with a code: joining comes first. -->
    <section class="card choice join" aria-labelledby="join-title">
      <h2 id="join-title">{t('home.join.title')}</h2>
      <p class="muted">{t('home.join.text')}</p>
      <form onsubmit={join} novalidate>
        <label for="code">{t('home.join.codeLabel')}</label>
        <div class="row">
          <input
            id="code"
            class="code-input"
            bind:value={code}
            inputmode="numeric"
            autocomplete="off"
            maxlength="7"
            placeholder="123456"
            aria-invalid={error !== ''}
            aria-describedby={error ? 'code-error' : undefined}
          />
          <button class="btn btn-primary btn-big" type="submit" disabled={checking}>
            {checking ? t('home.join.checking') : t('home.join.button')}
          </button>
        </div>
        {#if error}
          <p id="code-error" class="error" role="alert">{error}</p>
        {/if}
      </form>
    </section>

    <section class="card choice teacher" aria-labelledby="teacher-title">
      <h2 id="teacher-title">{t('home.teacher.title')}</h2>
      <p class="muted">{t('home.teacher.text')}</p>
      <a class="btn btn-secondary btn-big" href={href('/opettaja')} onclick={router.link}>{t('home.teacher.button')}</a>
    </section>
  </div>

  {#if mock}
    <section class="card demo no-print" aria-labelledby="demo-title">
      <h2 id="demo-title">{t('home.demo.title')}</h2>
      <div class="demo-buttons">
        <button class="btn btn-secondary" type="button" onclick={demoHost}>{t('home.demo.host')}</button>
        <button class="btn btn-secondary" type="button" onclick={demoPlay}>{t('home.demo.play')}</button>
      </div>
    </section>
  {/if}
</main>
<Footer />

<style>
  .hero {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 1.25rem;
    margin: 0.5rem 0 1.25rem;
  }
  .hero-art {
    width: min(46vw, 440px);
    height: auto;
  }
  @media (max-width: 640px) {
    .hero {
      grid-template-columns: 1fr;
      text-align: center;
    }
    .hero-art {
      order: -1;
      width: min(100%, 360px);
      justify-self: center;
    }
  }
  .hero h1 {
    font-size: clamp(2.4rem, 6vw, 3.6rem);
    margin: 0;
    color: var(--primary-dark);
  }
  .tagline {
    margin: 0.25rem 0 0;
    font-size: 1.2rem;
  }
  .choices {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 1.25rem;
  }
  @media (min-width: 760px) {
    .choices {
      grid-template-columns: 1.5fr 1fr;
    }
  }
  .join {
    border: 3px solid var(--primary);
  }
  .choice {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .choice h2 {
    font-size: 1.6rem;
  }
  .choice > .btn {
    margin-top: auto;
  }
  label {
    font-weight: 800;
    display: block;
    margin-bottom: 0.35rem;
  }
  .row {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  .code-input {
    flex: 1 1 10rem;
    min-width: 0;
    min-height: 64px;
    padding: 0 1rem;
    border: 3px solid var(--ink);
    border-radius: 12px;
    font-size: 2rem;
    font-weight: 800;
    letter-spacing: 0.2em;
    background: #fff;
  }
  .code-input[aria-invalid='true'] {
    border-color: var(--danger);
  }
  .error {
    color: var(--danger);
    font-weight: 700;
    margin: 0.5rem 0 0;
  }
  .demo {
    margin-top: 1.25rem;
  }
  .demo-buttons {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
</style>
