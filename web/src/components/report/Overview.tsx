import { pct, runFunnel } from '../../lib/analytics'
import { formatDate, formatDateTime, relativeDays } from '../../lib/format'
import type { Snapshot } from '../../lib/types'

function argentinaCount(data: Snapshot): number {
  return data.summary.by_location_scope.find((s) => s.name === 'Argentina')?.count ?? 0
}

/** Headline written from the data itself, plus a fact sheet of how the report is built. */
export function Lede({ data }: { data: Snapshot }) {
  const { summary, skills } = data
  const updated = summary.last_run?.finished_at ?? summary.generated_at
  const topSkill = skills.overall[0]
  const topRole = [...summary.by_role].sort((a, b) => b.count - a.count)[0]
  const total = summary.totals.active_jobs
  const facts = [
    { term: 'Edition', value: formatDate(updated) },
    { term: 'Refresh', value: 'Daily · 10:00 UTC' },
    { term: 'Active window', value: `Seen in the last ${summary.active_window_days} days` },
    { term: 'Sources', value: summary.by_source.map((s) => s.name).join(', ') || '—' },
    { term: 'Tracked since launch', value: `${summary.totals.tracked_all_time} jobs` },
  ]

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
      <header className="min-w-0 lg:col-span-8">
        <p className="eyebrow">
          Market report · Argentina &amp; LATAM ·{' '}
          <time dateTime={updated} title={formatDateTime(updated)}>
            updated {relativeDays(updated)}
          </time>
        </p>
        <h1 className="mt-3 text-3xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
          <span className="num text-accent">{total}</span> junior tech roles are open to candidates
          based in Argentina
        </h1>
        {total > 0 && (
          <p className="mt-4 text-lg leading-relaxed text-pretty text-muted">
            {summary.totals.pct_english}% of them are written in English.
            {topSkill && (
              <>
                {' '}
                <strong className="font-medium text-fg">{topSkill.name}</strong> is the most
                requested skill, mentioned in {topSkill.pct}% of postings
              </>
            )}
            {topRole && (
              <>
                , and <strong className="font-medium text-fg">{topRole.name}</strong> is the largest
                role type with {pct(topRole.count, total)}% of openings
              </>
            )}
            .
          </p>
        )}
      </header>
      <aside
        aria-label="About this report"
        className="min-w-0 lg:col-span-4 lg:border-l lg:border-line lg:pl-8"
      >
        <p className="eyebrow">About this report</p>
        <dl className="mt-3 divide-y divide-line/60 text-sm">
          {facts.map((f) => (
            <div key={f.term} className="grid grid-cols-[9rem_1fr] gap-3 py-2">
              <dt className="text-subtle">{f.term}</dt>
              <dd className="text-fg">{f.value}</dd>
            </div>
          ))}
        </dl>
      </aside>
    </div>
  )
}

export function Indicators({ data }: { data: Snapshot }) {
  const { totals, active_window_days } = data.summary
  const ar = argentinaCount(data)
  const items = [
    {
      label: 'Active jobs',
      value: totals.active_jobs,
      unit: '',
      note: `seen in last ${active_window_days}d`,
    },
    { label: 'New this week', value: totals.new_last_7_days, unit: '', note: 'published ≤ 7d' },
    {
      label: 'In English',
      value: totals.pct_english,
      unit: '%',
      note: `${Math.round((100 - totals.pct_english) * 10) / 10}% Spanish`,
    },
    {
      label: 'Names Argentina',
      value: pct(ar, totals.active_jobs),
      unit: '%',
      note: `${ar} of ${totals.active_jobs} jobs`,
    },
    {
      label: 'Sources',
      value: totals.sources,
      unit: '',
      note: 'public job boards',
    },
  ]
  return (
    <dl className="grid grid-cols-2 border-y border-line sm:grid-cols-5">
      {items.map((item, i) => (
        <div
          key={item.label}
          className={`min-w-0 py-5 ${i === 0 ? 'sm:pr-4' : 'sm:border-l sm:border-line sm:px-4'} ${
            i === items.length - 1
              ? 'col-span-2 border-t border-line sm:col-span-1 sm:border-t-0'
              : ''
          }`}
        >
          <dt className="eyebrow truncate">{item.label}</dt>
          <dd className="num mt-2 text-3xl font-medium tracking-tight">
            {item.value.toLocaleString('en-US')}
            <span className="text-xl text-subtle">{item.unit}</span>
          </dd>
          <dd className="mt-1 truncate text-xs text-subtle">{item.note}</dd>
        </div>
      ))}
    </dl>
  )
}

const FUNNEL_COLORS: Record<string, string> = {
  kept: 'var(--color-accent)',
  seniority: '#3b4f5e',
  not_tech: '#33505a',
  location: '#2e4452',
  duplicate: '#283a46',
}

/** How the last run went from raw postings to the jobs in this report. */
export function RunFunnel({ data }: { data: Snapshot }) {
  const run = data.summary.last_run
  const steps = runFunnel(run)
  if (!run || steps.length === 0) return null
  return (
    <figure aria-labelledby="funnel-caption">
      <figcaption
        id="funnel-caption"
        className="flex flex-wrap items-baseline justify-between gap-2"
      >
        <span className="eyebrow">Last pipeline run · from raw postings to this report</span>
        <span className="text-xs text-subtle">
          {formatDateTime(run.finished_at)} · status{' '}
          <span className={run.status === 'success' ? 'text-accent' : 'text-warn'}>
            {run.status}
          </span>
        </span>
      </figcaption>
      <div className="mt-3 flex h-3 w-full overflow-hidden rounded-sm" aria-hidden="true">
        {steps.map((s) => (
          <div
            key={s.key}
            style={{
              width: `${(100 * s.count) / run.fetched}%`,
              background: FUNNEL_COLORS[s.key] ?? '#2a3b48',
            }}
            className="h-full border-r border-canvas last:border-r-0"
          />
        ))}
      </div>
      <ol className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-3 lg:flex lg:justify-between">
        <li className="flex items-center gap-1.5 text-muted">
          <span className="size-2 rounded-[1px] border border-subtle" aria-hidden="true" />
          <span className="num text-fg">{run.fetched}</span> fetched
        </li>
        {steps.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5 whitespace-nowrap text-muted">
            <span
              className="size-2 shrink-0 rounded-[1px]"
              style={{ background: FUNNEL_COLORS[s.key] }}
              aria-hidden="true"
            />
            {s.key === 'kept' ? (
              <>
                <span className="num font-medium text-accent">{s.count}</span> kept
              </>
            ) : (
              <>
                <span className="num text-fg">−{s.count}</span> {s.label}
              </>
            )}
          </li>
        ))}
      </ol>
    </figure>
  )
}
