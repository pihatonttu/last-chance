<script lang="ts">
  import type { ActionGroup, DebriefData } from '@saari/debrief';
  import { formatNumber, LOCALE, t, tp } from '../../i18n/index.ts';
  import { ACTION_GROUPS } from '../../lib/enums.ts';
  import { gradeName, optionName, questionText } from '../../lib/format.ts';
  import { parseOptionId } from '../../lib/rules-info.ts';
  import ArtIcon from '../ArtIcon.svelte';
  import MoodFace from '../MoodFace.svelte';
  import PropPicture from '../PropPicture.svelte';
  import MiniChart from './MiniChart.svelte';
  import ShareBar, { type ShareSegment } from './ShareBar.svelte';

  /**
   * The debrief (design doc §13.2), shared by the teacher's named copy and the stored
   * pseudonymised one. It is read together on the projector, so it leads with pictures:
   * the village's story month by month and the questions to talk about. Charts, tables and
   * per-player detail wait behind "show more" (P38).
   */
  let { debrief }: { debrief: DebriefData } = $props();

  /** Validated categorical order (dataviz palette slots 1–6) + neutral grey for unused. */
  const GROUP_COLORS: Record<ActionGroup, string> = {
    food: '#2a78d6',
    fields: '#eb6834',
    materials: '#1baf7a',
    explore: '#eda100',
    skills: '#e87ba4',
    recreation: '#008300',
  };
  const UNUSED_COLOR = '#b9b6ae';
  const SERIES_1 = '#2a78d6';
  const SERIES_2 = '#eb6834';
  const NEGATIVE = '#e34948';

  const months = $derived(debrief.months.map((m) => m.month));
  const monthLabel = (m: number) => `${t('debrief.chart.month')} ${m}`;
  const date = $derived(new Date(debrief.createdAt).toLocaleDateString(LOCALE));
  const percentFmt = (v: number) => `${formatNumber(Math.round(v))} %`;

  const built = $derived(
    debrief.months
      .filter((m) => m.vote.outcome === 'built' && m.vote.option)
      .map((m) => ({ month: m.month, name: optionName({ id: m.vote.option! }) })),
  );

  function segments(counts: Record<ActionGroup, number>, unused: number): ShareSegment[] {
    return [
      ...ACTION_GROUPS.map((g) => ({ key: g, label: t(`debrief.group.${g}`), color: GROUP_COLORS[g], value: counts[g] })),
      { key: 'unused', label: t('debrief.group.unused'), color: UNUSED_COLOR, value: unused },
    ];
  }

  // Counts summed from actionsByMonth (actionShare holds shares of the used actions, not counts).
  const groupCounts = $derived(
    Object.fromEntries(
      ACTION_GROUPS.map((g) => [g, debrief.actionsByMonth.reduce((sum, m) => sum + m[g], 0)]),
    ) as Record<ActionGroup, number>,
  );
  const unusedTotal = $derived(debrief.actionsByMonth.reduce((sum, m) => sum + m.unused, 0));
  const groupSegments = $derived(segments(groupCounts, unusedTotal));
  const groupTotal = $derived(groupSegments.reduce((sum, s) => sum + s.value, 0));
  const share = (value: number) => (groupTotal > 0 ? Math.round((value / groupTotal) * 100) : 0);

  /** A picture for each kind of action in the legend (the map's own art). */
  const GROUP_ART: Record<ActionGroup | 'unused', { icon?: 'food' | 'wood'; prop?: string }> = {
    food: { icon: 'food' },
    fields: { prop: 'props/field-3' },
    materials: { icon: 'wood' },
    explore: { prop: 'props/boat' },
    skills: { prop: 'props/school-1' },
    recreation: { prop: 'props/gathering-1' },
    unused: {},
  };
  const builtArt = (option: string | null) => {
    const parsed = option ? parseOptionId(option) : null;
    return parsed ? `props/${parsed.kind}-${parsed.level}` : null;
  };
</script>

<article class="debrief" class:named={debrief.named}>
  <header class="head">
    <div>
      <h1>{t('debrief.title')}</h1>
      <p class="meta">
        {t('debrief.meta', { date, played: debrief.monthsPlayed, total: debrief.totalMonths, villagers: debrief.villagers })}
      </p>
      {#if debrief.endedEarly}<p class="meta">{t('debrief.endedEarly')}</p>{/if}
    </div>
    <div class="result">
      <span class="stars" aria-hidden="true">{#each [1, 2, 3, 4, 5, 6] as star (star)}<span class:on={star <= debrief.grade}>★</span>{/each}</span>
      <span class="grade">{gradeName(debrief.grade)}</span>
      <span>{t('end.grade', { grade: debrief.grade })} · {t('end.happiness', { n: debrief.happiness })}</span>
    </div>
    <p class="badge" class:warn={debrief.named}>{debrief.named ? t('debrief.named') : t('debrief.pseudonymous')}</p>
  </header>

  <section class="block">
    <h2>{t('debrief.chart.title')}</h2>
    <div class="scroll">
      <table class="story">
        <tbody>
          <tr>
            <th scope="row">{t('debrief.chart.month')}</th>
            {#each debrief.months as m (m.month)}<td class="month">{m.month}</td>{/each}
          </tr>
          <tr>
            <th scope="row">{t('debrief.table.built')}</th>
            {#each debrief.months as m (m.month)}
              <td>
                {#if m.vote.outcome === 'built'}
                  <span title={optionName({ id: m.vote.option ?? 'none' })}><PropPicture texture={builtArt(m.vote.option ?? null)} size={44} /></span>
                {:else if m.vote.outcome === 'tie'}
                  <span class="tie" title={t('debrief.table.tie')}>=</span>
                {:else}
                  <span class="nothing">–</span>
                {/if}
              </td>
            {/each}
          </tr>
          <tr>
            <th scope="row"><ArtIcon name="food" size={28} /><span class="visually-hidden">{t('debrief.story.food')}</span></th>
            {#each debrief.months as m (m.month)}
              <td>
                {#if m.food.hungry > 0}<span class="bad" title={tp('debrief.story.hungry', m.food.hungry)}>✗ {m.food.hungry}</span>
                {:else}<span class="good">✓</span>{/if}
              </td>
            {/each}
          </tr>
          <tr>
            <th scope="row"><ArtIcon name="shelter" size={28} /><span class="visually-hidden">{t('debrief.story.shelter')}</span></th>
            {#each debrief.months as m (m.month)}
              <td>
                {#if m.shelter.unsheltered > 0}<span class="bad" title={tp('debrief.story.unsheltered', m.shelter.unsheltered)}>✗ {m.shelter.unsheltered}</span>
                {:else}<span class="good">✓</span>{/if}
              </td>
            {/each}
          </tr>
          <tr>
            <th scope="row"><MoodFace mood={0} size={26} /><span class="visually-hidden">{t('debrief.chart.mood')}</span></th>
            {#each debrief.months as m (m.month)}<td title={String(m.mood.total)}><MoodFace mood={m.mood.total} size={30} /></td>{/each}
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <section class="block questions">
    <h2>{t('debrief.questions.title')}</h2>
    <ol>
      {#each debrief.questions as question (question.id)}
        <li>{questionText(question)}</li>
      {/each}
    </ol>
  </section>

  <section class="block">
    <details class="table-view">
    <summary>{t('debrief.chart.more')}</summary>
    <div class="charts">
      <MiniChart
        title={t('debrief.chart.food')}
        {months}
        {monthLabel}
        series={[
          { label: t('debrief.chart.foodHave'), color: SERIES_1, values: debrief.months.map((m) => m.food.before) },
          { label: t('debrief.chart.foodNeed'), color: SERIES_2, values: debrief.months.map((m) => m.food.need) },
        ]}
      />
      <MiniChart
        title={t('debrief.chart.shelterShare')}
        {months}
        {monthLabel}
        format={percentFmt}
        reference={{ value: 100, label: t('debrief.chart.everyone') }}
        yMax={100}
        series={[{ label: t('debrief.chart.shelterShare'), color: SERIES_1, values: debrief.months.map((m) => m.shelter.share * 100) }]}
      />
      <MiniChart
        title={t('debrief.chart.mood')}
        kind="bars"
        {months}
        {monthLabel}
        negativeColor={NEGATIVE}
        series={[{ label: t('debrief.chart.mood'), color: SERIES_1, values: debrief.months.map((m) => m.mood.total) }]}
      />
      <MiniChart
        title={t('debrief.chart.happiness')}
        {months}
        {monthLabel}
        series={[{ label: t('debrief.chart.happiness'), color: SERIES_1, values: debrief.months.map((m) => m.happiness) }]}
      />
    </div>
    {#if built.length > 0}
      <ol class="timeline">
        {#each built as item (item.month)}
          <li><strong>{item.month}.</strong> {item.name}</li>
        {/each}
      </ol>
    {/if}
    </details>
    <details class="table-view">
      <summary>{t('debrief.chart.tableToggle')}</summary>
      <div class="scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">{t('debrief.chart.month')}</th>
              <th scope="col">{t('debrief.chart.foodHave')}</th>
              <th scope="col">{t('debrief.chart.foodNeed')}</th>
              <th scope="col">{t('debrief.table.hungry')}</th>
              <th scope="col">{t('debrief.table.spoiled')}</th>
              <th scope="col">{t('debrief.chart.shelter')}</th>
              <th scope="col">{t('debrief.chart.mood')}</th>
              <th scope="col">{t('debrief.chart.happiness')}</th>
              <th scope="col">{t('debrief.table.built')}</th>
            </tr>
          </thead>
          <tbody>
            {#each debrief.months as m (m.month)}
              <tr>
                <th scope="row">{m.month}</th>
                <td>{formatNumber(m.food.before)}</td>
                <td>{formatNumber(m.food.need)}</td>
                <td>{formatNumber(m.food.hungry)}</td>
                <td>{formatNumber(m.food.spoiled)}</td>
                <td>{formatNumber(m.shelter.capacity)} / {formatNumber(m.villagers)}</td>
                <td>{formatNumber(m.mood.total)}</td>
                <td>{formatNumber(m.happiness)}</td>
                <td>
                  {m.vote.outcome === 'built' && m.vote.option
                    ? optionName({ id: m.vote.option })
                    : m.vote.outcome === 'tie'
                      ? t('debrief.table.tie')
                      : '–'}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </details>
  </section>

  <section class="block">
    <h2>{t('debrief.crises.title')}</h2>
    {#if debrief.crises.length === 0}
      <p>{t('debrief.crises.none')}</p>
    {:else}
      <ul class="crises">
        {#each debrief.crises as crisis (crisis.kind + crisis.month)}
          <li class={crisis.kind}>
            {tp(`debrief.crisis.${crisis.kind}`, crisis.people, { month: crisis.month, people: crisis.people })}
            {crisis.resolvedMonth !== null
              ? t('debrief.crisis.resolved', { month: crisis.resolvedMonth })
              : t('debrief.crisis.unresolved')}
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section class="block">
    <h2>{t('debrief.actions.title')}</h2>
    <h3>{t('debrief.actions.group')} · {t('debrief.actions.total', { n: groupTotal })}</h3>
    <ShareBar segments={groupSegments} label={t('debrief.actions.group')} height={26} />
    <ul class="legend">
      {#each groupSegments as segment (segment.key)}
        <li>
          <span class="swatch" style:background={segment.color}></span>
          {#if GROUP_ART[segment.key as ActionGroup | 'unused']?.icon}
            <ArtIcon name={GROUP_ART[segment.key as ActionGroup | 'unused']!.icon!} size={24} />
          {:else if GROUP_ART[segment.key as ActionGroup | 'unused']?.prop}
            <PropPicture texture={GROUP_ART[segment.key as ActionGroup | 'unused']!.prop!} size={28} />
          {/if}
          {segment.label}
          <strong>{formatNumber(segment.value)}</strong>
          <span class="pct">({share(segment.value)} %)</span>
        </li>
      {/each}
    </ul>
    {#if debrief.named && debrief.players.length > 0}
      <details class="table-view">
      <summary>{t('debrief.actions.players')}</summary>
      <ul class="per-player">
        {#each debrief.players as player (player.id)}
          <li>
            <span class="who"><span class="dot" style:background={player.color}></span>{player.label}</span>
            <ShareBar segments={segments(player.actions, player.unusedActions)} label={player.label} />
            <span class="skills">{t('debrief.player.skills', { education: player.education, tools: player.tools })}</span>
          </li>
        {/each}
      </ul>
      </details>
    {/if}
  </section>

  <section class="block">
    <h2>{t('debrief.votes.title')}</h2>
    <dl class="stats">
      <div>
        <dt>{t('debrief.votes.participation')}</dt>
        <dd>{percentFmt(debrief.votes.participation * 100)}</dd>
      </div>
      <div>
        <dt>{t('debrief.votes.ties')}</dt>
        <dd>{formatNumber(debrief.votes.ties)}</dd>
      </div>
      <div>
        <dt>{t('debrief.votes.empty')}</dt>
        <dd>{formatNumber(debrief.votes.emptyMonths)}</dd>
      </div>
      <div>
        <dt>{t('debrief.votes.winningShare')}</dt>
        <dd>{percentFmt(debrief.votes.averageWinningShare * 100)}</dd>
      </div>
    </dl>
    <p>
      {debrief.springFoundMonth !== null
        ? t('debrief.spring.found', { month: debrief.springFoundMonth })
        : t('debrief.spring.never')}
    </p>
    {#if debrief.named && debrief.players.length > 0}
      <details class="table-view">
        <summary>{t('debrief.votes.table')}</summary>
        <div class="scroll">
          <table class="votes-table">
            <thead>
              <tr>
                <th scope="col"></th>
                {#each months as month (month)}<th scope="col">{month}</th>{/each}
              </tr>
            </thead>
            <tbody>
              {#each debrief.players as player (player.id)}
                <tr>
                  <th scope="row"><span class="dot" style:background={player.color}></span> {player.label}</th>
                  {#each months as month (month)}
                    {@const vote = player.votes.find((v) => v.month === month)?.option ?? null}
                    <td>{vote === null ? t('debrief.votes.noVote') : optionName({ id: vote })}</td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </details>
    {/if}
  </section>

</article>

<style>
  .debrief {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    color: var(--ink);
  }
  .head {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.5rem 1rem;
    align-items: start;
  }
  h1 {
    margin: 0;
  }
  .meta {
    margin: 0.2rem 0 0;
    color: var(--muted);
    font-weight: 700;
  }
  .result {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    font-weight: 700;
  }
  .grade {
    font-size: 1.5rem;
    font-weight: 900;
  }
  .stars {
    font-size: 1.6rem;
    line-height: 1;
    color: #d5dbe0;
    letter-spacing: 0.05em;
  }
  .stars .on {
    color: var(--gold);
  }
  .story th {
    text-align: left;
    vertical-align: middle;
  }
  .story td {
    text-align: center;
    vertical-align: middle;
    min-width: 3.2rem;
    border-bottom: 1px solid var(--line);
  }
  .story .month {
    font-weight: 900;
    color: var(--muted);
  }
  .good {
    color: var(--ok);
    font-weight: 900;
    font-size: 1.2rem;
  }
  .bad {
    color: var(--danger);
    font-weight: 900;
    white-space: nowrap;
  }
  .tie {
    font-weight: 900;
    color: var(--warn);
    font-size: 1.3rem;
  }
  .nothing {
    color: var(--muted);
  }
  .badge {
    grid-column: 1 / -1;
    margin: 0;
    padding: 0.35rem 0.75rem;
    border-radius: var(--radius-small);
    background: var(--primary-soft);
    font-weight: 800;
  }
  .badge.warn {
    background: var(--warn-soft);
    color: var(--warn);
  }
  .block {
    background: var(--card);
    border-radius: var(--radius);
    padding: 1rem 1.25rem;
    box-shadow: var(--shadow);
    break-inside: avoid;
  }
  h2 {
    font-size: 1.3rem;
  }
  h3 {
    font-size: 1rem;
    margin: 0.75rem 0 0.4rem;
  }
  .charts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 380px), 1fr));
    gap: 0.75rem;
  }
  .timeline {
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin: 0.75rem 0 0;
    padding: 0;
  }
  .timeline li {
    padding: 0.15rem 0.6rem;
    border-radius: 999px;
    background: var(--ok-soft);
    font-size: 0.9rem;
  }
  .table-view {
    margin-top: 0.75rem;
  }
  .table-view summary {
    cursor: pointer;
    font-weight: 800;
    min-height: 44px;
    display: flex;
    align-items: center;
  }
  .scroll {
    overflow-x: auto;
  }
  table {
    border-collapse: collapse;
    font-size: 0.85rem;
    font-variant-numeric: tabular-nums;
  }
  th,
  td {
    padding: 0.25rem 0.5rem;
    border-bottom: 1px solid var(--line);
    text-align: right;
    white-space: nowrap;
  }
  thead th {
    text-align: right;
    color: var(--muted);
  }
  tbody th {
    text-align: left;
  }
  .votes-table td {
    text-align: left;
  }
  .crises {
    margin: 0;
    padding-left: 1.2rem;
  }
  .crises li {
    margin-bottom: 0.3rem;
  }
  .legend {
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1rem;
    margin: 0.5rem 0 0;
    padding: 0;
    font-size: 0.9rem;
  }
  .legend li {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }
  .swatch {
    width: 12px;
    height: 12px;
    border-radius: 3px;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
  .pct {
    color: var(--muted);
  }
  .per-player {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .per-player li {
    display: grid;
    grid-template-columns: minmax(8rem, 12rem) 1fr auto;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.9rem;
  }
  .who {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-weight: 800;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .skills {
    color: var(--muted);
    font-weight: 700;
    white-space: nowrap;
  }
  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    gap: 0.75rem;
    margin: 0 0 0.75rem;
  }
  .stats div {
    padding: 0.6rem 0.8rem;
    border-radius: var(--radius-small);
    background: var(--card-2);
  }
  dt {
    font-size: 0.85rem;
    color: var(--muted);
    font-weight: 700;
  }
  dd {
    margin: 0;
    font-size: 1.6rem;
    font-weight: 900;
  }
  .questions {
    border: 3px solid var(--primary);
  }
  .questions ol {
    margin: 0;
    padding-left: 1.6rem;
    font-size: 1.25rem;
    font-weight: 700;
  }
  .questions li {
    margin-bottom: 0.6rem;
  }
  @media print {
    .block {
      box-shadow: none;
      border: 1px solid #bbb;
      padding: 0.6rem 0.8rem;
    }
    .charts {
      grid-template-columns: 1fr 1fr;
    }
    .table-view:not([open]) {
      display: none;
    }
    .scroll {
      overflow: visible;
    }
    table {
      font-size: 7.5pt;
    }
    th,
    td {
      padding: 0.1rem 0.25rem;
      white-space: normal;
    }
  }
</style>
