import { useId, useMemo, useState } from 'react'
import { ANY, EMPTY_FILTERS, filterJobs, type JobFilters, uniqueValues } from '../lib/filters'
import { formatDate, LANGUAGE_LABELS, relativeDays, ROLE_COLORS } from '../lib/format'
import type { Job } from '../lib/types'
import { EmptyState } from './States'

const PAGE_SIZE = 25

function Select({
  label,
  value,
  options,
  onChange,
  format = (v) => v,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
  format?: (value: string) => string
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-slate-600">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
      >
        <option value={ANY}>All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {format(o)}
          </option>
        ))}
      </select>
    </div>
  )
}

function JobRow({ job }: { job: Job }) {
  const posted = job.published_at ?? job.first_seen_at
  return (
    <li className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-slate-50 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
            style={{ background: ROLE_COLORS[job.role_type] ?? '#94a3b8' }}
          >
            {job.role_type}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {job.seniority}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium uppercase text-slate-600">
            {job.language}
          </span>
        </div>
        <a
          href={job.url}
          className="mt-1.5 block font-semibold text-slate-900 hover:text-brand-700 hover:underline"
        >
          {job.title}
          <span className="sr-only"> (opens the original posting on {job.source})</span>
        </a>
        <p className="text-sm text-slate-600">
          {job.company || 'Company not disclosed'} · {job.location || job.location_scope}
        </p>
        {job.skills.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Skills">
            {job.skills.slice(0, 8).map((s) => (
              <li
                key={s}
                className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-600"
              >
                {s}
              </li>
            ))}
            {job.skills.length > 8 && (
              <li className="px-1 py-0.5 text-[11px] text-slate-400">
                +{job.skills.length - 8} more
              </li>
            )}
          </ul>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-4 text-sm md:flex-col md:items-end md:gap-1">
        <time dateTime={posted} title={formatDate(posted)} className="text-slate-500">
          {relativeDays(posted)}
        </time>
        <span className="text-xs text-slate-500">
          via{' '}
          {job.source_url ? (
            <a href={job.source_url} className="font-medium text-slate-700 hover:underline">
              {job.source}
            </a>
          ) : (
            job.source
          )}
        </span>
        <a
          href={job.url}
          className="rounded-lg border border-brand-600 px-3 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50"
          aria-label={`View "${job.title}" on ${job.source}`}
        >
          View posting →
        </a>
      </div>
    </li>
  )
}

export function JobsTable({ jobs }: { jobs: Job[] }) {
  const [filters, setFilters] = useState<JobFilters>(EMPTY_FILTERS)
  const [visible, setVisible] = useState(PAGE_SIZE)
  const searchId = useId()

  const options = useMemo(
    () => ({
      roles: uniqueValues(jobs, 'role_type'),
      languages: uniqueValues(jobs, 'language'),
      sources: uniqueValues(jobs, 'source'),
    }),
    [jobs],
  )
  const filtered = useMemo(() => filterJobs(jobs, filters), [jobs, filters])

  const update = (patch: Partial<JobFilters>) => {
    setFilters((f) => ({ ...f, ...patch }))
    setVisible(PAGE_SIZE)
  }
  const isFiltered = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS)

  return (
    <section id="jobs" className="card overflow-hidden" aria-labelledby="jobs-title">
      <div className="border-b border-slate-200 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="jobs-title" className="text-base font-semibold text-slate-900">
            Latest junior jobs
          </h2>
          <p className="text-sm text-slate-500" aria-live="polite">
            Showing {Math.min(visible, filtered.length)} of {filtered.length}
            {isFiltered && ` (filtered from ${jobs.length})`}
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] lg:items-end">
          <div className="flex flex-col gap-1">
            <label htmlFor={searchId} className="text-xs font-medium text-slate-600">
              Search
            </label>
            <input
              id={searchId}
              type="search"
              value={filters.query}
              onChange={(e) => update({ query: e.target.value })}
              placeholder="Title, company or skill (e.g. python, qa)"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400"
            />
          </div>
          <Select
            label="Role type"
            value={filters.role}
            options={options.roles}
            onChange={(role) => update({ role })}
          />
          <Select
            label="Language"
            value={filters.language}
            options={options.languages}
            onChange={(language) => update({ language })}
            format={(v) => LANGUAGE_LABELS[v] ?? v}
          />
          <Select
            label="Source"
            value={filters.source}
            options={options.sources}
            onChange={(source) => update({ source })}
          />
          <button
            type="button"
            onClick={() => update(EMPTY_FILTERS)}
            disabled={!isFiltered}
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Reset
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No jobs match these filters">
          Try another keyword or{' '}
          <button
            type="button"
            className="font-medium text-brand-700 underline"
            onClick={() => update(EMPTY_FILTERS)}
          >
            reset the filters
          </button>
          .
        </EmptyState>
      ) : (
        <>
          <ul className="divide-y divide-slate-100">
            {filtered.slice(0, visible).map((job) => (
              <JobRow key={job.id} job={job} />
            ))}
          </ul>
          {visible < filtered.length && (
            <div className="border-t border-slate-100 p-4 text-center">
              <button
                type="button"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Show more ({filtered.length - visible} left)
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
