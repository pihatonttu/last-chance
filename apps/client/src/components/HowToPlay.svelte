<script lang="ts">
  import type { GameLength } from '@saari/rules';
  import { t } from '../i18n/index.ts';
  import { PARAMS } from '../lib/rules-info.ts';
  import ArtIcon from './ArtIcon.svelte';
  import MoodFace from './MoodFace.svelte';
  import PropPicture from './PropPicture.svelte';

  /** The rules in five pictures and short sentences: on the projector's lobby and on pupils' devices while they wait. */
  let { length }: { length: GameLength } = $props();

  const months = $derived(PARAMS.months[length]);
</script>

<ol class="steps">
  <li><span class="art"><ArtIcon name="ship" size={64} /></span>{t('lobby.howTo.1', { months })}</li>
  <li>
    <span class="art bolts" aria-hidden="true">
      {#each Array.from({ length: PARAMS.baseActions }, (_, i) => i) as i (i)}
        <svg viewBox="0 0 24 24"><path d="M13.5 1.5 L4 13.5 H10.5 L9 22.5 L20 9.5 H13 Z" /></svg>
      {/each}
    </span>
    {t('lobby.howTo.2', { actions: PARAMS.baseActions })}
  </li>
  <li>
    <span class="art"><ArtIcon name="wood" size={36} /><ArtIcon name="stone" size={36} /><ArtIcon name="food" size={36} /></span>
    {t('lobby.howTo.3', { food: PARAMS.foodPerVillager })}
  </li>
  <li><span class="art"><PropPicture texture="props/shelter-1" size={64} /></span>{t('lobby.howTo.4')}</li>
  <li><span class="art"><MoodFace mood={5} size={52} /></span>{t('lobby.howTo.5')}</li>
</ol>

<style>
  .steps {
    list-style: none;
    margin: 0.5em 0 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(8.5em, 1fr));
    gap: 0.6em;
  }
  .steps li {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35em;
    padding: 0.6em 0.5em;
    border-radius: var(--radius-small);
    background: var(--card-2);
    text-align: center;
    font-weight: 700;
    line-height: 1.25;
  }
  .art {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.1em;
    min-height: 64px;
  }
  .bolts svg {
    width: 32px;
    height: 32px;
  }
  .bolts path {
    fill: #ffcf3f;
    stroke: #b07d00;
    stroke-width: 1.5;
    stroke-linejoin: round;
  }
</style>
