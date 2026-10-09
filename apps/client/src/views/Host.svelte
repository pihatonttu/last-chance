<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import type { DebriefData } from '@saari/debrief';
  import type { PlayerSummary, ServerMessage } from '@saari/protocol';
  import { SoundService } from '../audio/sound.svelte.ts';
  import Banner from '../components/Banner.svelte';
  import Debrief from '../components/debrief/Debrief.svelte';
  import DebriefTools from '../components/debrief/DebriefTools.svelte';
  import DevPanel from '../components/DevPanel.svelte';
  import EndScreen from '../components/EndScreen.svelte';
  import Icon from '../components/Icon.svelte';
  import Lobby from '../components/Lobby.svelte';
  import MonthSummary from '../components/MonthSummary.svelte';
  import PlayersPanel from '../components/PlayersPanel.svelte';
  import SoundToggle from '../components/SoundToggle.svelte';
  import Ticker from '../components/Ticker.svelte';
  import TopBar from '../components/TopBar.svelte';
  import VoteBars from '../components/VoteBars.svelte';
  import { t } from '../i18n/index.ts';
  import MapView from '../map/MapView.svelte';
  import { createTransport } from '../net/connect.ts';
  import { isMock } from '../net/mode.ts';
  import { tabStore, tokens } from '../net/storage.ts';
  import { href, router } from '../router.svelte.ts';
  import { GameSession, hostHello } from '../state/session.svelte.ts';

  let { code: codeProp }: { code: string } = $props();
  // App.svelte re-creates this view when the code changes ({#key}), so it is fixed here.
  const code = untrack(() => codeProp);

  const mock = isMock();
  // In the demo a reload loses the in-browser game; any token then starts a fresh one.
  const hostToken = tokens.host(code) ?? (mock ? `mock-${code}` : null);
  if (mock && tokens.host(code) === null && hostToken) tokens.setHost(code, hostToken);

  const session = hostToken ? new GameSession(code, createTransport(code), hostHello(code, hostToken)) : null;
  const sound = new SoundService('host');
  const debriefKey = `debrief.${code}`;

  let showPlayers = $state(false);
  let showDebrief = $state(false);
  let savedDebrief = $state<{ debrief: DebriefData; storedToken: string | null } | null>(readSaved());

  function readSaved(): { debrief: DebriefData; storedToken: string | null } | null {
    const raw = tabStore.get(debriefKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as { debrief: DebriefData; storedToken: string | null };
    } catch {
      return null;
    }
  }

  function onMessage(message: ServerMessage): void {
    switch (message.t) {
      case 'debrief':
        savedDebrief = { debrief: message.debrief, storedToken: message.storedToken };
        // Named debrief stays in this tab only (P23); never on the server, gone with the tab.
        tabStore.set(debriefKey, JSON.stringify(savedDebrief));
        break;
      case 'game':
        if (message.game.phase === 'action') sound.play('phase-action');
        else if (message.game.phase === 'vote') sound.play('phase-vote');
        else if (message.game.phase === 'summary') sound.play('phase-summary');
        else if (message.game.phase === 'ended') sound.play('game-end');
        break;
      case 'ticker':
        if (message.event.kind === 'built') sound.play('built');
        else if (message.event.kind === 'tie') sound.play('tie');
        else if (message.event.kind === 'spring-found') sound.play('spring-found');
        break;
      default:
        break;
    }
  }

  onMount(() => {
    if (!session) return;
    const off = session.onMessage(onMessage);
    session.start();
    return () => {
      off();
      session.stop();
    };
  });

  const client = $derived(session?.state ?? null);
  const game = $derived(client?.game ?? null);
  const debrief = $derived(client?.debrief ? { debrief: client.debrief, storedToken: client.storedToken } : savedDebrief);
  const running = $derived(game !== null && (game.phase === 'action' || game.phase === 'vote' || game.phase === 'summary'));
  const voters = $derived(game ? game.players.filter((p) => !p.removed && p.connected).length : 0);

  function rename(player: PlayerSummary): void {
    session?.host({ type: 'rename', playerId: player.id });
  }

  function kick(player: PlayerSummary): void {
    const name = player.nickname ?? t('players.hiddenName');
    if (confirm(t('players.kickConfirm', { name }))) session?.host({ type: 'kick', playerId: player.id });
  }

  function endGame(): void {
    if (confirm(t('host.endConfirm'))) session?.host({ type: 'end' });
  }
</script>

{#if !session}
  <main class="page">
    <p class="card" role="alert">{t('host.noToken')}</p>
    <a class="btn btn-primary" href={href('/')} onclick={router.link}>{t('common.home')}</a>
  </main>
{:else if client?.joinRefusal}
  <main class="page">
    <p class="card" role="alert">{t(`joinRefusal.${client.joinRefusal}`)}</p>
    <a class="btn btn-primary" href={href('/')} onclick={router.link}>{t('common.home')}</a>
  </main>
{:else if !game}
  <main class="page"><p class="card">{t('host.connecting')}</p></main>
{:else}
  {#if client && client.welcomed && client.status !== 'open'}
    <Banner message={t('host.reconnecting')} />
  {/if}
  {#if client?.error}
    <Banner tone="error" message={t(`serverError.${client.error}`)} />
  {/if}

  {#if game.phase === 'lobby'}
    <Lobby
      {game}
      onstart={() => session.host({ type: 'start' })}
      onhide={(hidden) => session.host({ type: 'hide-names', hidden })}
      onrename={rename}
      onkick={kick}
    />
  {:else if game.phase === 'ended'}
    <main class="ended">
      {#if showDebrief && debrief}
        <div class="debrief-wrap">
          <button type="button" class="btn btn-secondary no-print" onclick={() => (showDebrief = false)}>
            ← {t('end.hideDebrief')}
          </button>
          <DebriefTools storedToken={debrief.storedToken} trial={game.trial} />
          <Debrief debrief={debrief.debrief} />
        </div>
      {:else if game.result}
        <div class="card end-card">
          <EndScreen result={game.result}>
            {#if debrief}
              <button type="button" class="btn btn-primary btn-big" onclick={() => (showDebrief = true)}>{t('end.showDebrief')}</button>
            {:else}
              <p class="muted">{t('end.waitingDebrief')}</p>
            {/if}
          </EndScreen>
        </div>
      {:else}
        <div class="card end-card">
          <h1>{t('phase.ended')}</h1>
          <a class="btn btn-primary" href={href('/')} onclick={router.link}>{t('common.home')}</a>
        </div>
      {/if}
    </main>
  {:else if game.map && client}
    <div class="host-game">
      <TopBar {game} clockOffset={client.clockOffset} phaseTotalMs={client.phaseTotalMs} size="projector" />
      <div class="body">
        <div class="map-area">
          <MapView
            map={game.map}
            villagers={game.village.villagers}
            mode="projector"
            effects={client.effects}
            label={t('map.label.projector')}
          />
          {#if game.phase === 'summary' && game.lastReport}
            <div class="overlay">
              <div class="card overlay-card">
                <MonthSummary report={game.lastReport} />
              </div>
            </div>
          {/if}
        </div>
        <aside class="side">
          {#if game.phase === 'action'}
            <div class="card"><Ticker items={client.ticker} /></div>
          {/if}
          {#if game.vote}
            <div class="card">
              <VoteBars vote={game.vote} {voters} resources={game.village.resources} compact={game.phase === 'action'} />
            </div>
          {/if}
          {#if game.phase !== 'action'}
            <div class="card"><Ticker items={client.ticker} /></div>
          {/if}
          {#if showPlayers}
            <div class="card players-card">
              <PlayersPanel players={game.players} phase={game.phase} onrename={rename} onkick={kick} />
            </div>
          {/if}
        </aside>
      </div>
      <footer class="controls no-print">
        {#if running}
          {#if game.timer.paused}
            <button type="button" class="btn btn-primary" onclick={() => session.host({ type: 'resume' })}>{t('host.resume')}</button>
          {:else}
            <button type="button" class="btn btn-secondary" onclick={() => session.host({ type: 'pause' })}>{t('host.pause')}</button>
          {/if}
          <button
            type="button"
            class="btn btn-secondary"
            aria-label={t('host.extendLabel')}
            onclick={() => session.host({ type: 'extend' })}>{t('host.extend')}</button
          >
        {/if}
        <button type="button" class="btn btn-secondary" aria-pressed={showPlayers} onclick={() => (showPlayers = !showPlayers)}>
          <Icon name="people" />
          {showPlayers ? t('players.hide') : t('players.show')}
        </button>
        <label class="toggle">
          <input
            type="checkbox"
            checked={game.namesHidden}
            onchange={(e) => session.host({ type: 'hide-names', hidden: e.currentTarget.checked })}
          />
          {t('lobby.hideNames')}
        </label>
        <SoundToggle {sound} onLabel={t('host.soundOn')} offLabel={t('host.soundOff')} />
        <span class="spacer"></span>
        <button type="button" class="btn btn-danger" onclick={endGame}>{t('host.end')}</button>
      </footer>
    </div>
  {/if}
  {#if mock}<DevPanel {code} />{/if}
{/if}

<style>
  .host-game {
    display: grid;
    grid-template-rows: auto 1fr auto;
    height: 100dvh;
    overflow: hidden;
  }
  .body {
    display: grid;
    grid-template-columns: minmax(0, 1fr) clamp(260px, 25vw, 520px);
    min-height: 0;
  }
  .map-area {
    position: relative;
    min-height: 0;
  }
  .side {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.75rem;
    overflow-y: auto;
    font-size: clamp(16px, 1.15vw, 24px);
    background: var(--bg);
  }
  .side .card {
    padding: 0.9rem 1rem;
  }
  .overlay {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 1.5rem;
    background: rgb(10 30 45 / 0.35);
  }
  .overlay-card {
    width: min(100%, 60rem);
    max-height: 100%;
    overflow: auto;
    font-size: clamp(16px, 1.35vw, 28px);
    animation: rise 300ms ease-out;
  }
  .controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: var(--card);
    border-top: 3px solid var(--line);
  }
  .spacer {
    flex: 1;
  }
  .toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    min-height: 44px;
    font-weight: 800;
    cursor: pointer;
  }
  .toggle input {
    width: 22px;
    height: 22px;
    accent-color: var(--primary);
  }
  .ended {
    padding: 1.5rem 1rem 3rem;
  }
  .end-card {
    max-width: 52rem;
    margin: 2rem auto;
    font-size: clamp(16px, 1.4vw, 28px);
  }
  .debrief-wrap {
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  .debrief-wrap > .btn {
    align-self: flex-start;
  }
  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
  }
  @media print {
    .ended {
      padding: 0;
    }
  }
</style>
