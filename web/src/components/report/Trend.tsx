import { useMemo } from 'react'
import { pct, peakNote, topSource, weekExtremes } from '../../lib/analytics'
import type { JobFilters } from '../../lib/filters'
import { formatDate, formatWeek } from '../../lib/format'
import type { Job, SourceCount, Summary } from '../../lib/types'
import { Figure, Section } from '../Section'

function niceMax(value: number): number {
  if (value <= 5) return 5
  const step = value <= 20 ? 5 : 10
  return Math.ceil(value / step) * step
}

/** Dependency-free bar chart: HTML bars keep labels legible at every width. */
function WeeklyBars({ weekly, jobs }: { weekly: Summary['weekly']; jobs: Job[] }) {
  const { average, peak } = weekExtremes(weekly)
  const note = useMemo(() => peakNote(weekly, jobs), [weekly, jobs])
  const top = niceMax(Math.max(...weekly.map((w) => w.count), 1))
  const ticks = [0, top / 2, top]

  return (
    <Figure
      label="Publication week of the jobs that are open today"
      note={
        <>
          avg <span className="num text-muted">{average}</span> postings/week
        </>
      }
    >
      <div className="relative mt-6 h-60 pl-8">
        {/* y axis */}
        <span className="eyebrow absolute top-0 left-0 -translate-y-5 !text-[10px]">Postings</span>
        {ticks.map((t) => (
          <div
            key={t}
            className="absolute right-0 left-8 border-t border-line/70"
            style={{ bottom: `calc(1.375rem + (100% - 3rem) * ${t / top})` }}
            aria-hidden="true"
          >
            <span className="num absolute -left-8 -translate-y-1/2 text-[11px] text-subtle">
              {t}
            </span>
          </div>
        ))}
        <div
          className="absolute right-0 left-8 border-t border-dashed border-accent-2/80"
          style={{ bottom: `calc(1.375rem + (100% - 3rem) * ${average / top})` }}
          aria-hidden="true"
        />
        <ol
          className="relative flex h-full items-end gap-1 sm:gap-2"
          aria-label="Postings per week"
        >
          {weekly.map((w, i) => {
            const isPeak = !!peak && w.week === peak.week
            return (
              <li key={w.week} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                <span className="sr-only">
                  Week of {formatWeek(w.week)}: {w.count} postings
                </span>
                <span
                  className={`num mb-1 text-center text-[11px] ${isPeak ? 'text-fg' : 'text-subtle'}`}
                  aria-hidden="true"
                >
                  {w.count > 0 ? w.count : ''}
                </span>
                <span
                  className={`block rounded-t-[2px] ${isPeak && note ? 'bg-[repeating-linear-gradient(135deg,#4f7286_0_4px,#3b5566_4px_8px)]' : 'bg-[#4f7286]'}`}
                  style={{ height: `calc((100% - 3rem) * ${w.count / top})` }}
                  aria-hidden="true"
                />
                <span
                  className={`num mt-1.5 h-4 truncate text-center text-[10px] text-subtle ${i % 3 === 0 ? '' : 'invisible sm:visible'}`}
                  aria-hidden="true"
                >
                  {formatWeek(w.week)}
                </span>
              </li>
            )
          })}
        </ol>
      </div>
      <div className="mt-3 space-y-1.5 text-xs leading-relaxed text-subtle">
        {note && (
          <p className="border-l-2 border-warn pl-3 text-muted">
            <span className="font-medium text-warn">Batch upload, not a demand spike.</span>{' '}
            {note.dayCount} of the {note.weekCount} postings in the week of {formatWeek(note.week)}{' '}
            carry the same publication date ({formatDate(`${note.day}T12:00:00Z`)}) and come from{' '}
            {note.sources.join(', ')} (hatched bar).
          </p>
        )}
        <p>
          Each bar counts the jobs that are active in this report by the week they were published.
          Older postings that already closed are not included, so the chart cannot show how the
          market changes over time yet; that series starts with the daily pipeline history. Dashed
          line: weekly average.
        </p>
      </div>
    </Figure>
  )
}

function SourcesTable({
  sources,
  total,
  onExplore,
}: {
  sources: SourceCount[]
  total: number
  onExplore: (patch: Partial<JobFilters>) => void
}) {
  const top = topSource(sources, total)
  return (
    <Figure label="Sources · active jobs">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            <th scope="col" className="eyebrow pb-2 font-medium">
              Board
            </th>
            <th scope="col" className="eyebrow pb-2 text-right font-medium">
              Jobs
            </th>
            <th scope="col" className="eyebrow w-28 pb-2 pl-3 font-medium">
              Share
            </th>
          </tr>
        </thead>
        <tbody>
          {sources.map((s) => {
            const share = pct(s.count, total)
            return (
              <tr key={s.name} className="border-b border-line/60 last:border-0">
                <th scope="row" className="py-2.5 text-left font-normal">
                  <button
                    type="button"
                    onClick={() => onExplore({ source: s.name })}
                    className="hover:text-accent hover:underline"
                    aria-label={`Show jobs from ${s.name}`}
                  >
                    {s.name}
                  </button>
                  {s.url && (
                    <a
                      href={s.url}
                      className="ml-2 text-xs text-accent-2 hover:underline"
                      aria-label={`${s.name} website`}
                    >
                      ↗
                    </a>
                  )}
                </th>
                <td className="num py-2.5 text-right text-muted">{s.count}</td>
                <td className="py-2.5 pl-3">
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 flex-1 rounded-[1px] bg-surface-2" aria-hidden="true">
                      <span
                        className="block h-full rounded-[1px] bg-accent-2"
                        style={{ width: `${Math.max(share, 1)}%` }}
                      />
                    </span>
                    <span className="num w-11 text-right text-xs text-subtle">{share}%</span>
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="mt-3 text-xs leading-relaxed text-subtle">
        Counts after filtering: boards publish many more postings, but most are not junior or not
        open to Argentina.
        {top && top.pct >= 50 && (
          <>
            {' '}
            <span className="text-muted">
              {top.name} supplies {top.pct}% of the report, so shares mostly describe its listings.
            </span>
          </>
        )}
      </p>
    </Figure>
  )
}

export function TrendSection({
  summary,
  jobs,
  onExplore,
}: {
  summary: Summary
  jobs: Job[]
  onExplore: (patch: Partial<JobFilters>) => void
}) {
  return (
    <Section
      id="trend"
      index="03"
      title="Coverage and posting dates"
      dek="Which boards the jobs come from, and when the jobs that are open today were published."
    >
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-5">
          <SourcesTable
            sources={summary.by_source}
            total={summary.totals.active_jobs}
            onExplore={onExplore}
          />
        </div>
        <div className="min-w-0 lg:col-span-7">
          <WeeklyBars weekly={summary.weekly} jobs={jobs} />
        </div>
      </div>
    </Section>
  )
}
