<script lang="ts">
  import type { YouView } from '@saari/protocol';
  import { formatNumber, t } from '../i18n/index.ts';
  import { actionsPerMonth, maxSkillLevel, skillNeeded, toolsMultiplier } from '../lib/rules-info.ts';

  let { you, month }: { you: YouView; month: number } = $props();

  const max = maxSkillLevel();
  const skills = $derived([
    {
      key: 'education' as const,
      level: you.education,
      progress: you.educationProgress,
      effect: t('play.skills.educationEffect', { n: actionsPerMonth(you.education) }),
    },
    {
      key: 'tools' as const,
      level: you.tools,
      progress: you.toolsProgress,
      effect: t('play.skills.toolsEffect', { m: formatNumber(toolsMultiplier(you.tools)) }),
    },
  ]);
  const pips = $derived(Array.from({ length: you.maxActions }, (_, i) => i < you.actionsLeft));
</script>

<section class="status" aria-label={t('play.skills.title')}>
  <div class="actions" class:empty={you.actionsLeft === 0}>
    <span class="label">{t('play.actionsLeft', { left: you.actionsLeft, max: you.maxActions })}</span>
    <span class="pips" aria-hidden="true">
      {#each pips as full, i (i)}
        <span class="pip" class:full></span>
      {/each}
    </span>
  </div>
  {#if you.countsFromMonth > month}
    <p class="note">{t('play.countsFrom', { month: you.countsFromMonth })}</p>
  {/if}
  <div class="skills">
    {#each skills as skill (skill.key)}
      {@const needed = skillNeeded(skill.level)}
      <div class="skill">
        <span class="name">{t(`skill.${skill.key}`)}</span>
        <span class="level">{t('play.skills.level', { level: skill.level, max })}</span>
        <span class="effect">{skill.effect}</span>
        {#if skill.level >= max}
          <span class="small">{t('play.skills.max')}</span>
        {:else}
          <div class="bar" aria-hidden="true"><span style:width="{(skill.progress / needed) * 100}%"></span></div>
          <span class="small">{t('play.skills.progress', { done: skill.progress, needed })}</span>
        {/if}
      </div>
    {/each}
  </div>
</section>

<style>
  .status {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border-radius: var(--radius-small);
    background: var(--primary-soft);
    font-weight: 800;
  }
  .actions.empty {
    background: var(--card-2);
    color: var(--muted);
  }
  .pips {
    display: flex;
    gap: 0.3rem;
  }
  .pip {
    width: 1rem;
    height: 1rem;
    border-radius: 50%;
    border: 2px solid var(--primary-dark);
    background: transparent;
  }
  .pip.full {
    background: var(--primary);
  }
  .note {
    margin: 0;
    font-weight: 700;
    color: var(--warn);
  }
  .skills {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .skill {
    display: grid;
    grid-template-columns: auto auto 1fr;
    grid-template-areas:
      'name level effect'
      'bar bar small';
    align-items: center;
    gap: 0.15rem 0.5rem;
    padding: 0.4rem 0.6rem;
    border-radius: var(--radius-small);
    background: var(--card-2);
    font-size: 0.9rem;
  }
  .name {
    grid-area: name;
    font-weight: 800;
  }
  .level {
    grid-area: level;
    font-weight: 700;
  }
  .effect {
    grid-area: effect;
    justify-self: end;
    font-size: 0.8rem;
    color: var(--muted);
    font-weight: 700;
  }
  .skill .bar {
    grid-area: bar;
  }
  .skill .small {
    grid-area: small;
    justify-self: end;
  }
  .bar > span {
    background: #7b61c9;
  }
  .small {
    font-size: 0.8rem;
    color: var(--muted);
    font-weight: 700;
  }
</style>
