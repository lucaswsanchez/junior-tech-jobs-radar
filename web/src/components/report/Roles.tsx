import { useMemo } from 'react'
import { crossTab, pct, ROLE_ORDER } from '../../lib/analytics'
import { LANGUAGE_LABELS, ROLE_COLORS, SCOPE_COLORS, SCOPE_LABELS } from '../../lib/format'
import type { Job, NamedCount } from '../../lib/types'
import { Figure, Section } from '../Section'
import { EmptyState } from '../States'

const SCOPE_ORDER = ['Argentina', 'LATAM', 'Worldwide']

function StackedBar({
  parts,
  total,
}: {
  parts: { key: string; count: number; color: string }[]
  total: number
}) {
  return (
    <div
      className="flex h-2.5 w-full overflow-hidden rounded-[1px] bg-surface-2"
      aria-hidden="true"
    >
      {parts
        .filter((p) => p.count > 0)
        .map((p) => (
          <div
            key={p.key}
            className="h-full border-r border-canvas transition-[width] duration-500 last:border-r-0"
            style={{ width: `${(100 * p.count) / total}%`, background: p.color }}
          />
        ))}
    </div>
  )
}

function RoleComposition({ roles }: { roles: NamedCount[] }) {
  const total = roles.reduce((s, r) => s + r.count, 0)
  const sorted = [...roles].sort((a, b) => b.count - a.count)
  if (total === 0) return <EmptyState title="No active jobs" />
  return (
    <Figure label="Role type · share of active jobs" note={`n=${total}`}>
      <div
        className="flex h-10 w-full overflow-hidden rounded-[2px]"
        role="img"
        aria-label={sorted.map((r) => `${r.name} ${pct(r.count, total)}%`).join(', ')}
      >
        {sorted.map((r) => (
          <div
            key={r.name}
            className="h-full border-r-2 border-canvas last:border-r-0"
            style={{ width: `${(100 * r.count) / total}%`, background: ROLE_COLORS[r.name] }}
            title={`${r.name}: ${r.count}`}
          />
        ))}
      </div>
      <table className="mt-5 w-full text-sm">
        <thead className="sr-only">
          <tr>
            <th>Role type</th>
            <th>Jobs</th>
            <th>Share</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.name} className="border-b border-line/60 last:border-0">
              <td className="py-2">
                <span className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-[1px]"
                    style={{ background: ROLE_COLORS[r.name] }}
                    aria-hidden="true"
                  />
                  {r.name}
                </span>
              </td>
              <td className="num py-2 text-right text-muted">{r.count}</td>
              <td className="num w-16 py-2 text-right">{pct(r.count, total)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Figure>
  )
}

function Eligibility({ jobs }: { jobs: Job[] }) {
  const byRole = useMemo(
    () => crossTab(jobs, 'role_type', 'location_scope', ROLE_ORDER, SCOPE_ORDER),
    [jobs],
  )
  const byLang = useMemo(
    () => crossTab(jobs, 'language', 'location_scope', ['en', 'es'], SCOPE_ORDER),
    [jobs],
  )
  if (jobs.length === 0) return <EmptyState title="No active jobs" />
  const scopes = byRole.cols

  const row = (label: string, counts: Record<string, number>, total: number, swatch?: string) => (
    <li key={label} className="grid grid-cols-[8.5rem_1fr_2.5rem] items-center gap-3 text-sm">
      <span className="flex items-center gap-2 truncate">
        {swatch && (
          <span
            className="size-2 shrink-0 rounded-[1px]"
            style={{ background: swatch }}
            aria-hidden="true"
          />
        )}
        {label}
      </span>
      <StackedBar
        parts={scopes.map((s) => ({ key: s, count: counts[s], color: SCOPE_COLORS[s] }))}
        total={total}
      />
      <span className="num text-right text-xs text-subtle">{total}</span>
    </li>
  )

  return (
    <Figure label="Where can you work from?" note="Jobs per eligibility scope">
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {scopes.map((s) => (
          <div key={s}>
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <span
                className="size-2 rounded-[1px]"
                style={{ background: SCOPE_COLORS[s] }}
                aria-hidden="true"
              />
              {SCOPE_LABELS[s] ?? s}
            </p>
            <p className="num mt-0.5 text-2xl">
              {byRole.colTotals[s]}
              <span className="ml-1 text-sm text-subtle">
                {pct(byRole.colTotals[s], byRole.total)}%
              </span>
            </p>
          </div>
        ))}
      </div>
      <p className="eyebrow mt-6 mb-2">By role type</p>
      <ul className="space-y-2">
        {byRole.rows.map((r) => row(r, byRole.counts[r], byRole.rowTotals[r], ROLE_COLORS[r]))}
      </ul>
      <p className="eyebrow mt-6 mb-2">By posting language</p>
      <ul className="space-y-2">
        {byLang.rows.map((l) =>
          row(LANGUAGE_LABELS[l] ?? l, byLang.counts[l], byLang.rowTotals[l]),
        )}
      </ul>
      <p className="mt-4 text-xs leading-relaxed text-subtle">
        “Names Argentina” = the posting lists Argentina explicitly (alone or among other countries).
        “Worldwide” = remote with no country restriction. Every job in this report accepts
        candidates in Argentina by design.
      </p>
    </Figure>
  )
}

export function RolesSection({ roles, jobs }: { roles: NamedCount[]; jobs: Job[] }) {
  return (
    <Section
      id="roles"
      index="02"
      title="What kind of roles, and who can apply"
      dek="Role type is classified from the job title. Eligibility shows whether a posting names Argentina or is open worldwide."
    >
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <RoleComposition roles={roles} />
        </div>
        <div className="lg:col-span-7">
          <Eligibility jobs={jobs} />
        </div>
      </div>
    </Section>
  )
}
