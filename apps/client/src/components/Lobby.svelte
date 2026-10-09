<script lang="ts">
  import type { GameView, PlayerSummary } from '@saari/protocol';
  import { t, tp } from '../i18n/index.ts';
  import { spacedCode } from '../lib/format.ts';
  import { PARAMS } from '../lib/rules-info.ts';
  import { href } from '../router.svelte.ts';
  import QrCode from './QrCode.svelte';

  interface Props {
    game: GameView;
    onstart: () => void;
    onhide: (hidden: boolean) => void;
    onrename: (player: PlayerSummary) => void;
    onkick: (player: PlayerSummary) => void;
  }
  let { game, onstart, onhide, onrename, onkick }: Props = $props();

  const joinPath = $derived(href(`/play/${game.code}`));
  const joinUrl = $derived(`${location.origin}${joinPath}`);
  const players = $derived(game.players.filter((p) => !p.removed));
  const months = $derived(PARAMS.months[game.length]);
</script>

<div class="lobby">
  <section class="join card" aria-labelledby="join-title">
    <h1 id="join-title" class="visually-hidden">{t('lobby.codeLabel')}</h1>
    <p class="how">{t('lobby.joinAt')} <strong>{location.host}</strong> {t('lobby.enterCode')}</p>
    <p class="code">{spacedCode(game.code)}</p>
    <div class="qr-row">
      <QrCode value={joinUrl} label={t('lobby.scan')} size={220} />
      <p class="muted">{t('lobby.scan')}</p>
    </div>
    {#if game.trial}
      <p class="trial"><strong>{t('lobby.trialBadge')}</strong> · {t('lobby.trialHint')}</p>
    {/if}
    {#if game.trial || joinPath.includes('mock=1')}
      <a class="btn btn-secondary" href={joinPath} target="_blank" rel="noopener">{t('lobby.openStudent')}</a>
    {/if}
  </section>

  <section class="side">
    <div class="card players">
      <div class="players-head">
        <h2>{players.length > 0 ? tp('lobby.players', players.length) : t('lobby.noPlayers')}</h2>
        <label class="toggle">
          <input type="checkbox" checked={game.namesHidden} onchange={(e) => onhide(e.currentTarget.checked)} />
          {t('lobby.hideNames')}
        </label>
      </div>
      {#if game.namesHidden}
        <p class="muted">{t('lobby.namesHidden')}</p>
      {/if}
      <ul class="chips">
        {#each players as player (player.id)}
          <li class="player-chip" class:away={!player.connected}>
            <span class="dot" style:background={player.color}></span>
            {#if player.nickname !== null}<span class="name">{player.nickname}</span>{/if}
            <button
              type="button"
              class="mini"
              aria-label={t('players.renameLabel', { name: player.nickname ?? t('players.hiddenName') })}
              title={t('players.rename')}
              onclick={() => onrename(player)}>↻</button
            >
            <button
              type="button"
              class="mini danger"
              aria-label={t('players.kickLabel', { name: player.nickname ?? t('players.hiddenName') })}
              title={t('players.kick')}
              onclick={() => onkick(player)}>✕</button
            >
          </li>
        {/each}
      </ul>
      <button type="button" class="btn btn-primary btn-big start" disabled={players.length === 0} onclick={onstart}>
        {t('lobby.start')}
      </button>
      {#if players.length === 0}
        <p class="muted">{t('lobby.startNeedsPlayers')}</p>
      {/if}
    </div>

    <div class="card howto">
      <h2>{t('lobby.howTo.title')}</h2>
      <ol>
        <li>{t('lobby.howTo.1', { months })}</li>
        <li>{t('lobby.howTo.2', { actions: PARAMS.baseActions })}</li>
        <li>{t('lobby.howTo.3', { food: PARAMS.foodPerVillager })}</li>
        <li>{t('lobby.howTo.4')}</li>
        <li>{t('lobby.howTo.5')}</li>
      </ol>
    </div>
  </section>
</div>

<style>
  .lobby {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
    gap: 1.25rem;
    padding: 1.25rem;
    font-size: clamp(16px, 1.3vw, 26px);
    min-height: 100dvh;
  }
  .join {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.6em;
    text-align: center;
  }
  .how {
    font-size: 1.4em;
    margin: 0;
  }
  .code {
    margin: 0;
    font-size: clamp(64px, 9vw, 180px);
    font-weight: 900;
    letter-spacing: 0.06em;
    line-height: 1;
    color: var(--primary-dark);
    font-variant-numeric: tabular-nums;
  }
  .qr-row {
    display: flex;
    align-items: center;
    gap: 1em;
  }
  .trial {
    margin: 0;
    padding: 0.5em 0.9em;
    border-radius: var(--radius-small);
    background: var(--warn-soft);
    color: var(--warn);
  }
  .side {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
  .players-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1em;
    flex-wrap: wrap;
  }
  .players-head h2 {
    margin: 0;
  }
  .toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.5em;
    min-height: 44px;
    font-weight: 800;
    cursor: pointer;
  }
  .toggle input {
    width: 24px;
    height: 24px;
    accent-color: var(--primary);
  }
  .chips {
    list-style: none;
    margin: 0.75em 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5em;
    max-height: 40vh;
    overflow: auto;
  }
  .player-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.4em;
    padding: 0.25em 0.3em 0.25em 0.7em;
    border-radius: 999px;
    background: var(--card-2);
    border: 2px solid var(--line);
    font-weight: 800;
    animation: pop 250ms ease-out;
  }
  .player-chip.away {
    border-style: dashed;
    opacity: 0.7;
  }
  .player-chip .dot {
    width: 1.1em;
    height: 1.1em;
  }
  .mini {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 2px solid var(--line);
    background: var(--card);
    font-size: 1.1rem;
    font-weight: 900;
    cursor: pointer;
  }
  .mini:hover {
    border-color: var(--ink);
  }
  .mini.danger {
    color: var(--danger);
  }
  .start {
    width: 100%;
    font-size: 1.4em;
  }
  .howto ol {
    margin: 0;
    padding-left: 1.3em;
  }
  .howto li {
    margin-bottom: 0.35em;
  }
  @keyframes pop {
    from {
      transform: scale(0.8);
      opacity: 0;
    }
  }
  @media (max-width: 900px) {
    .lobby {
      grid-template-columns: 1fr;
    }
  }
</style>
