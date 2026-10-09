<script lang="ts">
  import type { PlayerSummary } from '@saari/protocol';
  import type { Phase } from '@saari/rules';
  import { t } from '../i18n/index.ts';

  interface Props {
    players: readonly PlayerSummary[];
    phase: Phase;
    onrename: (player: PlayerSummary) => void;
    onkick: (player: PlayerSummary) => void;
  }
  let { players, phase, onrename, onkick }: Props = $props();

  const active = $derived(players.filter((p) => !p.removed));
  const away = $derived(active.filter((p) => !p.connected).length);

  function display(p: PlayerSummary): string {
    return p.nickname ?? t('players.hiddenName');
  }
</script>

<section class="players" aria-labelledby="players-title">
  <h2 id="players-title">{t('players.title')} <span class="count">({active.length})</span></h2>
  {#if away > 0}
    <p class="summary">{t('players.summary', { present: active.length - away, away })}</p>
  {/if}
  <ul>
    {#each active as player (player.id)}
      <li class:away={!player.connected}>
        <span class="dot" style:background={player.color}></span>
        <span class="name">
          {player.nickname ?? ''}
          {#if player.nameLocked}<span class="tag">({t('players.nameLocked')})</span>{/if}
        </span>
        <span class="state">
          {#if !player.connected}
            {t('players.disconnected')}
          {:else if phase === 'action'}
            {t('players.actionsLeft', { n: player.actionsLeft })}
          {:else if phase === 'vote' && player.voted}
            {t('players.voted')}
          {:else}
            {t('players.connected')}
          {/if}
        </span>
        <span class="buttons">
          <button
            type="button"
            class="btn btn-secondary btn-small"
            aria-label={t('players.renameLabel', { name: display(player) })}
            onclick={() => onrename(player)}>{t('players.rename')}</button
          >
          <button
            type="button"
            class="btn btn-danger btn-small"
            aria-label={t('players.kickLabel', { name: display(player) })}
            onclick={() => onkick(player)}>{t('players.kick')}</button
          >
        </span>
      </li>
    {/each}
  </ul>
</section>

<style>
  h2 {
    margin: 0 0 0.4em;
    font-size: 1.1em;
  }
  .count {
    color: var(--muted);
  }
  .summary {
    margin: 0 0 0.4em;
    font-weight: 800;
    color: var(--warn);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.35em;
  }
  li {
    display: grid;
    grid-template-columns: auto 1fr auto;
    grid-template-areas:
      'dot name buttons'
      'dot state buttons';
    align-items: center;
    column-gap: 0.5em;
    padding: 0.35em 0.5em;
    border-radius: var(--radius-small);
    background: var(--card-2);
  }
  .dot {
    grid-area: dot;
    width: 1.1em;
    height: 1.1em;
  }
  .name {
    grid-area: name;
    font-weight: 800;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }
  .tag {
    font-size: 0.75em;
    color: var(--muted);
    font-weight: 700;
  }
  .state {
    grid-area: state;
    font-size: 0.8em;
    color: var(--muted);
    font-weight: 700;
  }
  .away {
    background: var(--warn-soft);
  }
  .away .state {
    color: var(--warn);
  }
  .buttons {
    grid-area: buttons;
    display: flex;
    gap: 0.3em;
  }
  .buttons .btn {
    font-size: 0.8rem;
    padding: 0.2rem 0.55rem;
  }
</style>
