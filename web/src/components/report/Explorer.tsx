import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { useId, useMemo, useState } from 'react'
import { ANY, EMPTY_FILTERS, filterJobs, type JobFilters, uniqueValues } from '../../lib/filters'
import { ageShort, formatDate, LANGUAGE_LABELS, ROLE_COLORS, SCOPE_LABELS } from '../../lib/format'
import type { Job } from '../../lib/types'
import { Section } from '../Section'
import { EmptyState } from '../States'

const PAGE_SIZE = 20

function postedAt(job: Job): string {
  return job.published_at ?? job.first_seen_at
}

const columns: ColumnDef<Job>[] = [
  {
    id: 'posted',
    header: 'Age',
    accessorFn: (job) => new Date(postedAt(job)).getTime(),
    cell: ({ row }) => (
      <time
        dateTime={postedAt(row.original)}
        title={formatDate(postedAt(row.original))}
        className="num text-muted"
      >
        {ageShort(postedAt(row.original))}
      </time>
    ),
  },
  {
    id: 'title',
    header: 'Role',
    accessorFn: (job) => job.title.toLowerCase(),
    cell: ({ row }) => {
      const job = row.original
      return (
        <div className="min-w-[14rem]">
          <a
            href={job.url}
            className="font-medium text-fg decoration-accent underline-offset-2 hover:underline"
          >
            {job.title}
            <span className="sr-only"> (original posting on {job.source})</span>
          </a>
          <p className="mt-0.5 text-xs text-subtle">
            {job.company || 'Company not disclosed'} · {job.seniority}
          </p>
        </div>
      )
    },
  },
  {
    id: 'role_type',
    header: 'Type',
    accessorKey: 'role_type',
    cell: ({ getValue }) => {
      const role = getValue<string>()
      return (
        <span className="flex items-center gap-1.5 whitespace-nowrap text-muted">
          <span
            className="size-2 rounded-[1px]"
            style={{ background: ROLE_COLORS[role] }}
            aria-hidden="true"
          />
          {role}
        </span>
      )
    },
  },
  {
    id: 'skills',
    header: 'Skills',
    enableSorting: false,
    accessorFn: (job) => job.skills.join(', '),
    cell: ({ row }) => {
      const skills = row.original.skills
      if (skills.length === 0) return <span className="text-subtle">—</span>
      return (
        <span className="font-mono text-xs text-muted" title={skills.join(', ')}>
          {skills.slice(0, 4).join(' · ')}
          {skills.length > 4 && <span className="text-subtle"> +{skills.length - 4}</span>}
        </span>
      )
    },
  },
  {
    id: 'scope',
    header: 'Eligibility',
    accessorKey: 'location_scope',
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-muted" title={row.original.location}>
        {SCOPE_LABELS[row.original.location_scope] ?? row.original.location_scope}
      </span>
    ),
  },
  {
    id: 'language',
    header: 'Lang',
    accessorKey: 'language',
    cell: ({ getValue }) => (
      <span className="num text-xs text-muted uppercase">{getValue<string>()}</span>
    ),
  },
  {
    id: 'source',
    header: 'Source',
    accessorKey: 'source',
    cell: ({ row }) => (
      <a href={row.original.url} className="whitespace-nowrap text-accent-2 hover:underline">
        {row.original.source} ↗
      </a>
    ),
  },
]

/** Hidden on small screens to keep the table readable; the info stays in other cells. */
const HIDE_ON_MOBILE = new Set(['skills', 'scope', 'language'])

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
      <label htmlFor={id} className="eyebrow">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="field">
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

export function ExplorerSection({ jobs }: { jobs: Job[] }) {
  const [filters, setFilters] = useState<JobFilters>(EMPTY_FILTERS)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'posted', desc: true }])
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

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: PAGE_SIZE } },
    autoResetPageIndex: true,
  })

  const update = (patch: Partial<JobFilters>) => setFilters((f) => ({ ...f, ...patch }))
  const isFiltered = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS)
  const { pageIndex } = table.getState().pagination
  const from = filtered.length === 0 ? 0 : pageIndex * PAGE_SIZE + 1
  const to = Math.min((pageIndex + 1) * PAGE_SIZE, filtered.length)

  return (
    <Section
      id="explorer"
      index="04"
      title="Job explorer"
      dek="Every active posting in this report. Search, filter and sort; each row links to the original posting on its source board."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] lg:items-end">
        <div className="flex flex-col gap-1">
          <label htmlFor={searchId} className="eyebrow">
            Search
          </label>
          <input
            id={searchId}
            type="search"
            value={filters.query}
            onChange={(e) => update({ query: e.target.value })}
            placeholder="Title, company, location or skill"
            className="field"
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
          onClick={() => setFilters(EMPTY_FILTERS)}
          disabled={!isFiltered}
          className="rounded-md border border-line px-3 py-2 text-sm text-muted enabled:hover:border-subtle enabled:hover:text-fg disabled:cursor-not-allowed disabled:text-subtle"
        >
          Reset
        </button>
      </div>

      <p className="mt-4 text-sm text-muted" aria-live="polite">
        <span className="num text-fg">{filtered.length}</span> of{' '}
        <span className="num">{jobs.length}</span> jobs
        {filtered.length > 0 && (
          <span className="text-subtle">
            {' '}
            · showing {from}–{to}
          </span>
        )}
      </p>

      {filtered.length === 0 ? (
        <EmptyState title="No jobs match these filters">
          Try a broader keyword or{' '}
          <button
            type="button"
            className="text-accent underline"
            onClick={() => setFilters(EMPTY_FILTERS)}
          >
            reset the filters
          </button>
          .
        </EmptyState>
      ) : (
        <>
          <div className="mt-3 overflow-x-auto border-t border-line">
            <table className="w-full text-sm">
              <caption className="sr-only">Active junior tech jobs, sortable by column</caption>
              <thead>
                {table.getHeaderGroups().map((group) => (
                  <tr key={group.id} className="border-b border-line">
                    {group.headers.map((header) => {
                      const sorted = header.column.getIsSorted()
                      const hide = HIDE_ON_MOBILE.has(header.column.id)
                        ? 'hidden md:table-cell'
                        : ''
                      return (
                        <th
                          key={header.id}
                          scope="col"
                          aria-sort={
                            sorted === 'asc'
                              ? 'ascending'
                              : sorted === 'desc'
                                ? 'descending'
                                : 'none'
                          }
                          className={`py-2.5 pr-4 text-left font-medium ${hide}`}
                        >
                          {header.column.getCanSort() ? (
                            <button
                              type="button"
                              onClick={header.column.getToggleSortingHandler()}
                              className="eyebrow inline-flex items-center gap-1 hover:text-fg"
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              <span
                                aria-hidden="true"
                                className={sorted ? 'text-accent' : 'opacity-40'}
                              >
                                {sorted === 'asc' ? '↑' : sorted === 'desc' ? '↓' : '↕'}
                              </span>
                            </button>
                          ) : (
                            <span className="eyebrow">
                              {flexRender(header.column.columnDef.header, header.getContext())}
                            </span>
                          )}
                        </th>
                      )
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-line/60 align-top transition-colors hover:bg-surface"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={`py-3 pr-4 ${HIDE_ON_MOBILE.has(cell.column.id) ? 'hidden md:table-cell' : ''}`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {table.getPageCount() > 1 && (
            <nav
              className="mt-4 flex items-center justify-between gap-3 text-sm"
              aria-label="Table pagination"
            >
              <button
                type="button"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="rounded-md border border-line px-3 py-1.5 text-muted enabled:hover:text-fg disabled:cursor-not-allowed disabled:text-subtle"
              >
                ← Previous
              </button>
              <span className="num text-xs text-subtle">
                Page {pageIndex + 1} / {table.getPageCount()}
              </span>
              <button
                type="button"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="rounded-md border border-line px-3 py-1.5 text-muted enabled:hover:text-fg disabled:cursor-not-allowed disabled:text-subtle"
              >
                Next →
              </button>
            </nav>
          )}
        </>
      )}
    </Section>
  )
}
