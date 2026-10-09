<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { PROTOCOL_VERSION, type ServerMessage } from '@saari/protocol';
  import type { Coord } from '@saari/rules';
  import { SoundService } from '../audio/sound.svelte.ts';
  import Banner from '../components/Banner.svelte';
  import DevPanel from '../components/DevPanel.svelte';
  import EndScreen from '../components/EndScreen.svelte';
  import MonthSummary from '../components/MonthSummary.svelte';
  import SkillStatus from '../components/SkillStatus.svelte';
  import SoundToggle from '../components/SoundToggle.svelte';
  import TilePanel from '../components/TilePanel.svelte';
  import TopBar from '../components/TopBar.svelte';
  import VoteCards from '../components/VoteCards.svelte';
  import { t, tp } from '../i18n/index.ts';
  import { checkNickname } from '../lib/names.ts';
  import MapView from '../map/MapView.svelte';
  import { createTransport } from '../net/connect.ts';
  import { isMock } from '../net/mode.ts';
  import { tokens } from '../net/storage.ts';
  import { href, router } from '../router.svelte.ts';
  import { tileAt } from '../state/reducer.ts';
  import { GameSession } from '../state/session.svelte.ts';

  let { code: codeProp }: { code: string } = $props();
  // App.svelte re-creates this view when the code changes ({#key}), so it is fixed here.
  const code = untrack(() => codeProp);

  const mock = isMock();
  const sound = new SoundService('player');
  const TERMINAL = ['unknown-game', 'join-closed', 'game-ended', 'kicked', 'protocol-mismatch'];

  /** Nickname waiting to be sent; cleared on refusal so a reconnect does not resend it. */
  let pendingNickname: string | null = null;
  let hadToken = $state(tokens.player(code) !== null);

  const session = new GameSession(code, createTransport(code), () => {
    const playerToken = tokens.player(code);
    if (playerToken) return { t: 'hello-player', protocol: PROTOCOL_VERSION, code, playerToken };
    if (pendingNickname) return { t: 'hello-player', protocol: PROTOCOL_VERSION, code, nickname: pendingNickname };
    return null;
  });

  let nickname = $state('');
  let formError = $state('');
  let joining = $state(false);
  let selected = $state<Coord | null>(null);
  let pendingAct = $state<Coord | null>(null);
  let tab = $state<'tile' | 'vote'>('tile');

  function onMessage(message: ServerMessage): void {
    switch (message.t) {
      case 'welcome':
        joining = false;
        if (message.playerToken) tokens.setPlayer(code, message.playerToken);
        hadToken = true;
        break;
      case 'refused-join':
        joining = false;
        pendingNickname = null;
        if (message.reason === 'bad-token' || message.reason === 'kicked') {
          tokens.setPlayer(code, null);
          hadToken = false;
        }
        break;
      case 'kicked':
        tokens.setPlayer(code, null);
        break;
      case 'act-result':
        pendingAct = null;
        if (message.ok) sound.play('action');
        break;
      case 'game':
        if (message.game.phase === 'vote') tab = 'vote';
        else if (message.game.phase === 'action') tab = 'tile';
        if (message.game.phase === 'action') sound.play('phase-action');
        else if (message.game.phase === 'vote') sound.play('phase-vote');
        else if (message.game.phase === 'ended') sound.play('game-end');
        break;
      default:
        break;
    }
  }

  onMount(() => {
    const off = session.onMessage(onMessage);
    if (tokens.player(code)) session.start();
    return () => {
      off();
      session.stop();
    };
  });

  function join(event: SubmitEvent): void {
    event.preventDefault();
    const check = checkNickname(nickname);
    if (!check.ok) {
      formError = t(`nickname.${check.reason}`);
      return;
    }
    formError = '';
    session.clearRefusal();
    pendingNickname = check.nickname;
    joining = true;
    if (!session.started) session.start();
    else if (session.state.status === 'open') session.sendHello();
  }

  const client = $derived(session.state);
  const game = $derived(client.game);
  const you = $derived(client.you);
  const refusal = $derived(client.joinRefusal);
  const terminal = $derived(refusal !== null && TERMINAL.includes(refusal));
  const selectedTile = $derived(selected && game ? tileAt(game, selected.x, selected.y) : null);
  const preview = $derived(
    selected && client.preview && client.preview.x === selected.x && client.preview.y === selected.y ? client.preview.preview : null,
  );

  // Ask for a fresh preview whenever the selected tile, the phase or my actions change.
  $effect(() => {
    const tile = selectedTile;
    const phase = game?.phase;
    const left = you?.actionsLeft;
    if (!tile || phase !== 'action') return;
    void left;
    untrack(() => session.inspect(tile.x, tile.y));
  });

  // A lost act-result must not leave the button stuck.
  $effect(() => {
    if (!pendingAct) return;
    const timer = setTimeout(() => (pendingAct = null), 4000);
    return () => clearTimeout(timer);
  });

  function select(x: number, y: number): void {
    selected = { x, y };
    tab = 'tile';
  }

  function act(): void {
    if (!selected) return;
    pendingAct = selected;
    session.act(selected.x, selected.y);
  }
</script>

{#if client.kicked}
  <main class="page center">
    <div class="card message">
      <h1>{t('play.kicked.title')}</h1>
      <p>{t('play.kicked.text')}</p>
      <a class="btn btn-primary" href={href('/')} onclick={router.link}>{t('common.home')}</a>
    </div>
  </main>
{:else if terminal && refusal}
  <main class="page center">
    <div class="card message">
      <h1>{t('play.refused.title')}</h1>
      <p role="alert">{t(`joinRefusal.${refusal}`)}</p>
      <a class="btn btn-primary" href={href('/')} onclick={router.link}>{t('common.home')}</a>
    </div>
  </main>
{:else if !client.welcomed || !game}
  {#if hadToken && !refusal}
    <main class="page center"><p class="card message">{t('play.connecting')}</p></main>
  {:else}
    <main class="page center">
      <form class="card message join" onsubmit={join} novalidate>
        <h1>{t('play.nickname.title')}</h1>
        <p class="muted">{t('play.title', { code })}</p>
        <label for="nickname">{t('play.nickname.label')}</label>
        <input
          id="nickname"
          bind:value={nickname}
          autocomplete="off"
          autocapitalize="words"
          spellcheck="false"
          maxlength="24"
          aria-invalid={formError !== '' || refusal !== null}
          aria-describedby="nickname-hint"
        />
        <p id="nickname-hint" class="muted hint">{t('play.nickname.hint')}</p>
        {#if formError}
          <p class="error" role="alert">{formError}</p>
        {:else if refusal}
          <p class="error" role="alert">{t(`joinRefusal.${refusal}`)}</p>
        {/if}
        <button class="btn btn-primary btn-big" type="submit" disabled={joining}>
          {joining ? t('play.joining') : t('play.nickname.submit')}
        </button>
      </form>
    </main>
  {/if}
{:else}
  {#if client.status !== 'open'}
    <Banner message={t('play.reconnecting')} />
  {/if}
  {#if game.phase === 'lobby'}
    <main class="page center">
      <div class="card message waiting">
        <h1>{t('play.waiting.title')}</h1>
        {#if you}
          <p class="you"><span class="dot" style:background={you.color}></span>{t('play.waiting.you')}: <strong>{you.nickname}</strong></p>
        {/if}
        <p>{t('play.waiting.text')}</p>
        <p class="muted">{tp('play.waiting.count', game.playerCount)}</p>
        <SoundToggle {sound} onLabel={t('play.soundOn')} offLabel={t('play.soundOff')} />
      </div>
    </main>
  {:else if game.phase === 'ended'}
    <main class="page center">
      <div class="card message">
        {#if game.result}
          <EndScreen result={game.result}>
            <a class="btn btn-secondary" href={href('/')} onclick={router.link}>{t('common.home')}</a>
          </EndScreen>
        {:else}
          <h1>{t('phase.ended')}</h1>
        {/if}
      </div>
    </main>
  {:else if game.map}
    <div class="play">
      <TopBar {game} clockOffset={client.clockOffset} phaseTotalMs={client.phaseTotalMs} />
      <div class="body">
        <div class="map-area">
          <MapView
            map={game.map}
            villagers={game.village.villagers}
            mode="student"
            {selected}
            effects={client.effects}
            onselect={select}
            label={t('map.label.student')}
          />
          {#if game.phase === 'summary' && game.lastReport}
            <div class="overlay">
              <div class="card overlay-card"><MonthSummary report={game.lastReport} /></div>
            </div>
          {/if}
        </div>
        <aside class="panel">
          <div class="panel-head">
            {#if you}<span class="you"><span class="dot" style:background={you.color}></span>{you.nickname}</span>{/if}
            <SoundToggle {sound} onLabel={t('play.soundOn')} offLabel={t('play.soundOff')} />
          </div>
          {#if you && game.phase === 'action'}<SkillStatus {you} month={game.month} />{/if}
          {#if you && you.actionsLeft === 0 && game.phase === 'action'}
            <p class="hint-box">{t('play.noActionsLeft')}</p>
          {/if}
          <div class="tabs" role="tablist">
            <button type="button" role="tab" class="tab" aria-selected={tab === 'tile'} onclick={() => (tab = 'tile')}>
              {t('play.tab.tile')}
            </button>
            <button type="button" role="tab" class="tab" aria-selected={tab === 'vote'} onclick={() => (tab = 'vote')}>
              {t('play.tab.vote')}
            </button>
          </div>
          <div class="tab-body" role="tabpanel">
            {#if tab === 'vote' && game.vote}
              <VoteCards
                vote={game.vote}
                phase={game.phase}
                myVote={you?.vote ?? null}
                pending={client.pendingVote}
                villagers={game.village.villagers}
                resources={game.village.resources}
                lastVote={client.lastVote}
                onvote={(option) => session.vote(option)}
              />
            {:else if selectedTile && game.map}
              <TilePanel
                tile={selectedTile}
                landing={game.map.landing}
                villagers={game.village.villagers}
                phase={game.phase}
                {preview}
                pending={pendingAct !== null}
                lastAct={client.lastAct}
                onact={act}
              />
            {:else}
              <p class="muted">{t('tile.select')}</p>
            {/if}
          </div>
        </aside>
      </div>
    </div>
  {/if}
{/if}
{#if mock}<DevPanel {code} />{/if}

<style>
  .center {
    min-height: 90dvh;
    display: grid;
    place-items: center;
  }
  .message {
    width: min(100%, 34rem);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .message h1 {
    margin: 0;
  }
  .join label {
    font-weight: 800;
  }
  .join input {
    min-height: 56px;
    padding: 0 1rem;
    border: 3px solid var(--ink);
    border-radius: 12px;
    font-size: 1.4rem;
    font-weight: 700;
    background: #fff;
  }
  .join input[aria-invalid='true'] {
    border-color: var(--danger);
  }
  .hint {
    margin: 0;
    font-size: 0.9rem;
  }
  .error {
    margin: 0;
    color: var(--danger);
    font-weight: 800;
  }
  .waiting {
    text-align: center;
    align-items: center;
  }
  .you {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-weight: 800;
  }
  .play {
    display: grid;
    grid-template-rows: auto 1fr;
    height: 100dvh;
    overflow: hidden;
  }
  .body {
    display: grid;
    grid-template-columns: minmax(0, 1fr) clamp(300px, 34vw, 400px);
    min-height: 0;
  }
  .map-area {
    position: relative;
    min-height: 0;
  }
  .panel {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding: 0.6rem 0.75rem 1rem;
    overflow-y: auto;
    background: var(--card);
    border-left: 3px solid var(--line);
  }
  .panel-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
  }
  .hint-box {
    margin: 0;
    padding: 0.5rem 0.75rem;
    border-radius: var(--radius-small);
    background: var(--warn-soft);
    color: var(--warn);
    font-weight: 700;
  }
  .tabs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.35rem;
    padding: 0.25rem;
    border-radius: 12px;
    background: var(--card-2);
  }
  .tab {
    min-height: 44px;
    border: none;
    border-radius: 9px;
    background: transparent;
    font-weight: 800;
    cursor: pointer;
  }
  .tab[aria-selected='true'] {
    background: var(--primary);
    color: #fff;
  }
  .overlay {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 1rem;
    background: rgb(10 30 45 / 0.35);
  }
  .overlay-card {
    width: min(100%, 44rem);
    max-height: 100%;
    overflow: auto;
    font-size: 15px;
  }
</style>
