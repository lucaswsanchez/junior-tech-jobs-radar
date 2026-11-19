import { pct, roleGroups, runFunnel, topSource } from '../../lib/analytics'
import { formatDate, formatDateTime, relativeDays } from '../../lib/format'
import type { Snapshot } from '../../lib/types'

function count(list: { name: string; count: number }[], name: string): number {
  return list.find((s) => s.name === name)?.count ?? 0
}

/** Three-segment summary: core tech vs AI data work vs tech-adjacent roles. */
function GroupBar({ data }: { data: Snapshot }) {
  const groups = roleGroups(data.summary.by_role)
  const total = groups.reduce((s, g) => s + g.count, 0)
  if (total === 0) return null
  return (
    <figure className="mt-6" aria-labelledby="groups-caption">
      <figcaption id="groups-caption" className="eyebrow mb-2">
        What the {total} jobs are · by role group
      </figcaption>
      <div className="flex h-9 w-full overflow-hidden rounded-[2px]">
        {groups
          .filter((g) => g.count > 0)
          .map((g) => (
            <div
              key={g.key}
              className="flex h-full min-w-0 items-center border-r-2 border-canvas px-1.5 last:border-r-0 sm:px-2"
              style={{ width: `${(100 * g.count) / total}%`, background: g.color }}
            >
              <span className="num truncate text-[11px] font-medium text-canvas sm:text-xs">
                {g.pct}%
              </span>
            </div>
          ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
        {groups.map((g) => (
          <li key={g.key} className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-[1px]"
              style={{ background: g.color }}
              aria-hidden="true"
            />
            <span className="text-fg">{g.label}</span>
            <span className="num">{g.count}</span>
            <span className="text-subtle">({g.roles.join(', ')})</span>
          </li>
        ))}
      </ul>
    </figure>
  )
}

/** Headline written from the data itself, plus a fact sheet of how the report is built. */
export function Lede({ data }: { data: Snapshot }) {
  const { summary, skills } = data
  const updated = summary.last_run?.finished_at ?? summary.generated_at
  const total = summary.totals.active_jobs
  const topSkill = skills.overall[0]
  const [core] = roleGroups(summary.by_role)
  const top = topSource(summary.by_source, total)
  const facts = [
    { term: 'Edition', value: formatDate(updated) },
    { term: 'Refresh', value: 'Daily · 10:00 UTC' },
    { term: 'Active window', value: `Seen in the last ${summary.active_window_days} days` },
    {
      term: 'Source mix',
      value: top
        ? `${top.name} ${top.pct}% · ${summary.by_source.length - 1} other boards ${Math.round((100 - top.pct) * 10) / 10}%`
        : '—',
    },
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
        <h1 className="mt-3 text-3xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-[2.75rem]">
          <span className="num text-accent">{total}</span> junior tech roles are open to candidates
          based in Argentina
        </h1>
        {total > 0 && (
          <p className="mt-3 text-lg leading-relaxed text-pretty text-muted">
            <strong className="font-medium text-fg">{core.pct}%</strong> are core tech roles
            (development, QA, data, IT support). {summary.totals.pct_english}% are written in
            English
            {topSkill && (
              <>
                , and <strong className="font-medium text-fg">{topSkill.name}</strong> is the most
                requested skill ({topSkill.pct}% of postings)
              </>
            )}
            .
          </p>
        )}
        <GroupBar data={data} />
      </header>
      <aside
        aria-label="About this report"
        className="min-w-0 lg:col-span-4 lg:border-l lg:border-line lg:pl-8"
      >
        <p className="eyebrow">About this report</p>
        <dl className="mt-2 divide-y divide-line/60 text-sm">
          {facts.map((f) => (
            <div key={f.term} className="grid grid-cols-[8.5rem_1fr] gap-3 py-1.5">
              <dt className="text-subtle">{f.term}</dt>
              <dd className="text-fg">{f.value}</dd>
            </div>
          ))}
        </dl>
        {top && top.pct >= 50 && (
          <p className="mt-3 border-l-2 border-warn pl-3 text-xs leading-relaxed text-muted">
            <span className="font-medium text-warn">Coverage note.</span> {top.pct}% of the jobs
            come from {top.name}. Read every share in this report as mostly reflecting that
            board&apos;s junior listings.
          </p>
        )}
      </aside>
    </div>
  )
}

export function Indicators({ data }: { data: Snapshot }) {
  const { totals, active_window_days, by_location_scope, by_source } = data.summary
  const ar = count(by_location_scope, 'Argentina')
  const top = topSource(by_source, totals.active_jobs)
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
      note: top ? `${top.pct}% from ${top.name}` : 'public job boards',
    },
  ]
  return (
    <dl className="grid grid-cols-2 border-y border-line lg:grid-cols-5">
      {items.map((item, i) => (
        <div
          key={item.label}
          className={`min-w-0 py-5 ${i === 0 ? 'lg:pr-4' : 'lg:border-l lg:border-line lg:px-4'} ${i % 2 === 1 ? 'pl-4 lg:pl-4' : ''} ${
            i === items.length - 1
              ? 'col-span-2 border-t border-line lg:col-span-1 lg:border-t-0'
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

/** Dimensions that barely vary are stated as findings instead of being charted. */
export function Findings({ data }: { data: Snapshot }) {
  const { totals, by_seniority } = data.summary
  const entry = count(by_seniority, 'Entry level')
  const junior = count(by_seniority, 'Junior')
  const total = totals.active_jobs
  if (total === 0) return null
  return (
    <p className="text-sm text-muted">
      <span className="eyebrow mr-2">Also in the data</span>
      Seniority: <span className="num text-fg">{pct(entry, total)}%</span> entry level ({entry}) and{' '}
      <span className="num text-fg">{pct(junior, total)}%</span> junior ({junior}) · Work mode:{' '}
      <span className="num text-fg">{totals.pct_remote}%</span> remote. Both are shown as figures,
      not charts, because they barely vary.
    </p>
  )
}

const KEPT = 'var(--color-accent)'
const REJECTED = '#3a4d5b'

/** How the last run went from raw postings to the jobs in this report, labelled in place. */
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
        <span className="eyebrow">
          Last pipeline run · {run.fetched} raw postings → {run.kept} in this report
        </span>
        <span className="text-xs text-subtle">
          {formatDateTime(run.finished_at)} · status{' '}
          <span className={run.status === 'success' ? 'text-accent' : 'text-warn'}>
            {run.status}
          </span>
        </span>
      </figcaption>
      <ol
        className="mt-3 flex h-12 w-full overflow-hidden rounded-[2px]"
        aria-label="Pipeline funnel"
      >
        {steps.map((s) => {
          const share = (100 * s.count) / run.fetched
          const kept = s.key === 'kept'
          return (
            <li
              key={s.key}
              className="flex h-full min-w-0 flex-col justify-center border-r-2 border-canvas px-2 last:border-r-0"
              style={{ width: `${share}%`, background: kept ? KEPT : REJECTED }}
              title={`${kept ? 'Kept' : `Removed: ${s.label}`}: ${s.count}`}
            >
              {share >= 9 && (
                <>
                  <span
                    className={`num truncate text-sm font-medium ${kept ? 'text-canvas' : 'text-fg'}`}
                  >
                    {kept ? s.count : `−${s.count}`}
                  </span>
                  <span
                    className={`truncate text-[11px] ${kept ? 'text-canvas/80' : 'text-muted'}`}
                  >
                    {kept ? 'kept' : s.label}
                  </span>
                </>
              )}
            </li>
          )
        })}
      </ol>
      <p className="mt-2 text-xs text-subtle">
        Removed:{' '}
        {steps
          .filter((s) => s.key !== 'kept')
          .map((s) => `${s.count} ${s.label}`)
          .join(' · ')}
        . Segments are in order of size; only the kept share is highlighted.
      </p>
    </figure>
  )
}

const SECTIONS = [
  { id: 'skills', label: 'Skills' },
  { id: 'roles', label: 'Roles' },
  { id: 'trend', label: 'Activity' },
  { id: 'explorer', label: 'Explorer' },
]

/** In-page index: the report is long, especially on mobile. */
export function SectionNav() {
  return (
    <nav aria-label="Report sections" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
      {SECTIONS.map((s, i) => (
        <a key={s.id} href={`#${s.id}`} className="text-muted hover:text-fg">
          <span className="num mr-1.5 text-accent">{String(i + 1).padStart(2, '0')}</span>
          {s.label}
        </a>
      ))}
    </nav>
  )
}
