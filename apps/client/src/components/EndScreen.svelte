<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { BadgeId } from '@saari/debrief';
  import type { GameResult } from '@saari/protocol';
  import { formatNumber, t } from '../i18n/index.ts';
  import { GRADES } from '../lib/enums.ts';
  import { gradeName } from '../lib/format.ts';
  import ArtIcon from './ArtIcon.svelte';
  import BadgePicture from './BadgePicture.svelte';

  /**
   * The result as a picture (docs/10-arktinen.md §2, §4b, §6). At the aurora party the
   * icebreaker brings the guests under the northern lights, and the village's level shows
   * as stars and its name. When the village gave up, the icebreaker comes without a party:
   * no stars and no level. A pupil's own device shows their badges either way (docs/09 §2.3).
   * The whole ladder of levels waits behind "More info".
   */
  let {
    result,
    badges = null,
    children,
  }: { result: GameResult; badges?: readonly BadgeId[] | null; children?: Snippet } = $props();

  const ladder = [...GRADES].reverse();
  const top = GRADES.length;
</script>

<section class="end" aria-labelledby="end-title">
  {#if result.lost}
    <span class="ship"><ArtIcon name="ship" size={150} /></span>
    <h1 id="end-title">{t('end.lost.title')}</h1>
    <p class="kicker lost">{t('end.lost.text')}</p>
    <p class="meta">{t('end.happiness', { n: formatNumber(result.happiness) })}</p>
  {:else}
    {#if !result.early}
      <!-- The northern lights over the icebreaker; still when the reader asks for less motion. -->
      <div class="sky" aria-hidden="true">
        <span class="aurora a1"></span>
        <span class="aurora a2"></span>
        <span class="aurora a3"></span>
        <span class="twinkle"></span>
        <span class="sea"></span>
        <span class="ship"><ArtIcon name="ship" size={150} /></span>
      </div>
    {/if}
    <p class="kicker">{result.early ? t('end.early') : t('end.arrived')}</p>
    <p class="stars" aria-label={t('end.grade', { grade: result.grade })}>
      {#each Array.from({ length: top }, (_, i) => i + 1) as star (star)}
        <span class:on={star <= result.grade} aria-hidden="true">★</span>
      {/each}
    </p>
    <h1 id="end-title">{gradeName(result.grade)}</h1>
    <p class="meta">{t('end.happiness', { n: formatNumber(result.happiness) })}</p>
  {/if}
  {#if badges && badges.length > 0}
    <section class="badges" aria-labelledby="badges-title">
      <h2 id="badges-title">{t('end.badges')}</h2>
      <ul>
        {#each badges as badge (badge)}
          <li>
            <BadgePicture {badge} size={56} />
            <strong>{t(`badge.${badge}.name`)}</strong>
            <span>{t(`badge.${badge}.text`)}</span>
          </li>
        {/each}
      </ul>
    </section>
  {/if}
  {#if !result.lost}
    <details class="more">
      <summary>{t('end.levels')}</summary>
      <ol class="ladder">
        {#each ladder as grade (grade)}
          <li class:reached={grade === result.grade}>
            <span class="mini" aria-hidden="true">{'★'.repeat(grade)}</span>
            <span>{gradeName(grade)}</span>
          </li>
        {/each}
      </ol>
    </details>
  {/if}
  <p class="thanks">{t('end.thanks')}</p>
  {#if children}
    <div class="actions no-print">{@render children()}</div>
  {/if}
</section>

<style>
  .end {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4em;
  }
  .ship {
    animation: bob 3s ease-in-out infinite;
  }
  .ship :global(img) {
    width: 7.5em;
    height: 7.5em;
  }
  @keyframes bob {
    50% {
      transform: translateY(-6px) rotate(-1.5deg);
    }
  }

  /* Night sky with the northern lights: blurred bands of green, blue and violet that sway. */
  .sky {
    position: relative;
    width: min(100%, 26em);
    height: 11em;
    border-radius: var(--radius);
    overflow: hidden;
    background: linear-gradient(#081428 0%, #12284a 55%, #1f3d63 100%);
    isolation: isolate;
  }
  .aurora {
    position: absolute;
    left: -25%;
    width: 150%;
    height: 55%;
    border-radius: 50%;
    filter: blur(12px);
    mix-blend-mode: screen;
    animation: sway 8s ease-in-out infinite alternate;
  }
  .a1 {
    top: 2%;
    background: radial-gradient(ellipse 50% 40% at 50% 60%, rgb(90 255 170 / 0.9), transparent 70%);
  }
  .a2 {
    top: 14%;
    background: radial-gradient(ellipse 45% 35% at 40% 50%, rgb(70 210 255 / 0.75), transparent 70%);
    animation-duration: 10s;
    animation-delay: -4s;
  }
  .a3 {
    top: -6%;
    background: radial-gradient(ellipse 40% 30% at 65% 55%, rgb(190 120 255 / 0.6), transparent 70%);
    animation-duration: 12s;
    animation-delay: -7s;
  }
  @keyframes sway {
    from {
      transform: translateX(-10%) skewX(-14deg) scaleY(0.85);
      opacity: 0.7;
    }
    to {
      transform: translateX(10%) skewX(14deg) scaleY(1.15);
      opacity: 1;
    }
  }
  .twinkle {
    position: absolute;
    inset: 0;
    z-index: -1;
    background-image:
      radial-gradient(1.5px 1.5px at 8% 18%, #fff, transparent),
      radial-gradient(1.5px 1.5px at 22% 42%, #fff, transparent),
      radial-gradient(2px 2px at 37% 12%, #fff, transparent),
      radial-gradient(1.5px 1.5px at 58% 30%, #fff, transparent),
      radial-gradient(2px 2px at 74% 9%, #fff, transparent),
      radial-gradient(1.5px 1.5px at 86% 38%, #fff, transparent),
      radial-gradient(1.5px 1.5px at 94% 16%, #fff, transparent);
  }
  .sea {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 2.2em;
    background: linear-gradient(#2a5a85, #1b3f63);
    border-top: 0.3em solid #e8f2f8;
  }
  .sky .ship {
    position: absolute;
    left: 50%;
    bottom: 0.6em;
    margin-left: -3em;
  }
  .sky .ship :global(img) {
    width: 6em;
    height: 6em;
  }
  @media (prefers-reduced-motion: reduce) {
    .ship,
    .aurora {
      animation: none;
    }
  }

  .kicker {
    margin: 0;
    font-weight: 800;
    color: var(--primary-dark);
    font-size: 1.3em;
  }
  .kicker.lost {
    max-width: 24em;
    color: var(--ink);
  }
  .stars {
    margin: 0;
    font-size: 2.6em;
    letter-spacing: 0.08em;
    line-height: 1;
    color: #d5dbe0;
  }
  .stars .on {
    color: var(--gold);
    text-shadow: 0 2px 0 rgb(0 0 0 / 0.12);
  }
  h1 {
    margin: 0;
    font-size: 2.4em;
    color: var(--ink);
  }
  .meta {
    margin: 0;
    font-weight: 800;
    color: var(--muted);
  }
  .more summary {
    font-weight: 800;
    color: var(--primary-dark);
    cursor: pointer;
    min-height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .ladder {
    list-style: none;
    margin: 0.3em 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25em;
    min-width: min(22em, 100%);
  }
  .ladder li {
    display: flex;
    align-items: center;
    gap: 0.6em;
    padding: 0.2em 0.7em;
    border-radius: 999px;
    color: var(--muted);
    font-weight: 700;
    text-align: left;
  }
  .mini {
    min-width: 6.5em;
    color: var(--gold);
    letter-spacing: 0.05em;
  }
  .ladder .reached {
    background: var(--gold);
    color: var(--ink);
    font-weight: 900;
  }
  .ladder .reached .mini {
    color: #fff;
  }
  .thanks {
    max-width: 34em;
    margin: 0.4em 0;
  }
  .actions {
    display: flex;
    gap: 0.75em;
    flex-wrap: wrap;
    justify-content: center;
  }
  .badges h2 {
    margin: 0.3em 0;
    font-size: 1.1em;
  }
  .badges ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.8em;
  }
  .badges li {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2em;
    max-width: 9em;
    text-align: center;
  }
</style>
