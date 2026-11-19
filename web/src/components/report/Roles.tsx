import { useMemo } from 'react'
import { crossTab, pct, ROLE_GROUPS } from '../../lib/analytics'
import type { JobFilters } from '../../lib/filters'
import { ROLE_COLORS, SCOPE_COLORS, SCOPE_LABELS } from '../../lib/format'
import type { Job, NamedCount } from '../../lib/types'
import { Figure, Section } from '../Section'
import { EmptyState } from '../States'

const SCOPE_ORDER = ['Argentina', 'LATAM', 'Worldwide']

function Meter({ value, color }: { value: number; color: string }) {
  return (
    <span className="relative block h-2 flex-1 rounded-[1px] bg-surface-2" aria-hidden="true">
      <span
        className="absolute inset-y-0 left-0 rounded-[1px] transition-[width] duration-500"
        style={{ width: `${value}%`, background: color }}
      />
    </span>
  )
}

function ScopeBar({
  counts,
  total,
  scopes,
}: {
  counts: Record<string, number>
  total: number
  scopes: string[]
}) {
  return (
    <span className="flex h-2 flex-1 overflow-hidden rounded-[1px] bg-surface-2" aria-hidden="true">
      {scopes
        .filter((s) => (counts[s] ?? 0) > 0)
        .map((s) => (
          <span
            key={s}
            className="h-full border-r border-canvas last:border-r-0"
            style={{ width: `${(100 * counts[s]) / total}%`, background: SCOPE_COLORS[s] }}
          />
        ))}
    </span>
  )
}

function RoleButton({
  name,
  onExplore,
}: {
  name: string
  onExplore: (patch: Partial<JobFilters>) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onExplore({ role: name })}
      className="flex min-w-0 items-center gap-2 text-left hover:text-accent hover:underline"
      aria-label={`Show ${name} jobs`}
    >
      <span
        className="size-2.5 shrink-0 rounded-[1px]"
        style={{ background: ROLE_COLORS[name] }}
        aria-hidden="true"
      />
      <span className="truncate">{name}</span>
    </button>
  )
}

interface Row {
  name: string
  count: number
  share: number
  scope: Record<string, number>
  ar: number
  en: number
}

export function RolesSection({
  roles,
  jobs,
  onExplore,
}: {
  roles: NamedCount[]
  jobs: Job[]
  onExplore: (patch: Partial<JobFilters>) => void
}) {
  const total = roles.reduce((s, r) => s + r.count, 0)
  const scope = useMemo(
    () => crossTab(jobs, 'role_type', 'location_scope', [], SCOPE_ORDER),
    [jobs],
  )
  const lang = useMemo(() => crossTab(jobs, 'role_type', 'language', [], ['en', 'es']), [jobs])
  const scopes = scope.cols
  const counts = new Map(roles.map((r) => [r.name, r.count]))
  const maxShare = Math.max(...roles.map((r) => pct(r.count, total)), 1)

  const groups = ROLE_GROUPS.map((g) => {
    const rows: Row[] = g.roles
      .filter((name) => (counts.get(name) ?? 0) > 0)
      .map((name) => {
        const count = counts.get(name) ?? 0
        const sc = scope.counts[name] ?? {}
        return {
          name,
          count,
          share: pct(count, total),
          scope: sc,
          ar: pct(sc.Argentina ?? 0, count),
          en: pct(lang.counts[name]?.en ?? 0, count),
        }
      })
      .sort((a, b) => b.count - a.count)
    const groupCount = rows.reduce((s, r) => s + r.count, 0)
    return { ...g, rows, count: groupCount, share: pct(groupCount, total) }
  }).filter((g) => g.rows.length > 0)

  return (
    <Section
      id="roles"
      index="02"
      title="What kind of roles, and who can apply"
      dek="Role type is classified from the job title and grouped for reading: core tech, AI data work and tech-adjacent roles. For each role: its share of the report, how many postings name Argentina explicitly and how many are written in English. Select a role to see its postings."
    >
      {total === 0 ? (
        <EmptyState title="No active jobs" />
      ) : (
        <Figure
          label="Role type × eligibility × language"
          note={
            <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {scopes.map((s) => (
                <span key={s} className="flex items-center gap-1.5">
                  <span
                    className="size-2 rounded-[1px]"
                    style={{ background: SCOPE_COLORS[s] }}
                    aria-hidden="true"
                  />
                  {SCOPE_LABELS[s] ?? s}
                </span>
              ))}
            </span>
          }
        >
          {/* Desktop and tablet: one table */}
          <table className="hidden w-full table-fixed text-sm md:table">
            <caption className="sr-only">
              Active jobs per role type, grouped, with the share that names Argentina and the share
              written in English
            </caption>
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="eyebrow w-44 pb-2 text-left font-medium">
                  Role type
                </th>
                <th scope="col" className="eyebrow w-14 pb-2 text-right font-medium">
                  Jobs
                </th>
                <th scope="col" className="eyebrow pb-2 pl-6 text-left font-medium">
                  Share of report
                </th>
                <th scope="col" className="eyebrow pb-2 pl-6 text-left font-medium">
                  Names Argentina
                </th>
                <th scope="col" className="eyebrow w-24 pb-2 text-right font-medium">
                  In English
                </th>
              </tr>
            </thead>
            {groups.map((g) => (
              <tbody key={g.key}>
                <tr className="h-9 border-b border-line">
                  <th scope="rowgroup" colSpan={2} className="text-left">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-3 w-1 rounded-[1px]"
                        style={{ background: g.color }}
                        aria-hidden="true"
                      />
                      <span className="eyebrow !text-fg">{g.label}</span>
                    </span>
                  </th>
                  <td className="pl-6 text-xs text-muted" colSpan={3}>
                    <span className="num text-fg">{g.count}</span> jobs ·{' '}
                    <span className="num text-fg">{g.share}%</span> of the report
                  </td>
                </tr>
                {g.rows.map((r) => (
                  <tr key={r.name} className="h-10 border-b border-line/60">
                    <th scope="row" className="pl-3 text-left font-normal">
                      <RoleButton name={r.name} onExplore={onExplore} />
                    </th>
                    <td className="num text-right text-muted">{r.count}</td>
                    <td className="pl-6">
                      <span className="flex items-center gap-3">
                        <Meter value={(100 * r.share) / maxShare} color={ROLE_COLORS[r.name]} />
                        <span className="num w-12 text-right">{r.share}%</span>
                      </span>
                    </td>
                    <td className="pl-6">
                      <span className="flex items-center gap-3">
                        <ScopeBar counts={r.scope} total={r.count} scopes={scopes} />
                        <span className="num w-12 text-right">{r.ar}%</span>
                      </span>
                    </td>
                    <td className="num text-right">{r.en}%</td>
                  </tr>
                ))}
              </tbody>
            ))}
            <tfoot>
              <tr className="h-10">
                <th scope="row" className="text-left font-medium text-muted">
                  All roles
                </th>
                <td className="num text-right text-fg">{total}</td>
                <td className="pl-6">
                  <span className="flex items-center gap-3">
                    <span className="flex-1" />
                    <span className="num w-12 text-right text-muted">100%</span>
                  </span>
                </td>
                <td className="pl-6">
                  <span className="flex items-center gap-3">
                    <ScopeBar counts={scope.colTotals} total={scope.total} scopes={scopes} />
                    <span className="num w-12 text-right text-fg">
                      {pct(scope.colTotals.Argentina ?? 0, scope.total)}%
                    </span>
                  </span>
                </td>
                <td className="num text-right text-fg">
                  {pct(lang.colTotals.en ?? 0, lang.total)}%
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Mobile: one card per role, nothing hidden behind a horizontal scroll */}
          <div className="space-y-5 md:hidden">
            {groups.map((g) => (
              <section key={g.key} aria-label={g.label}>
                <p className="flex items-center justify-between border-b border-line pb-1.5">
                  <span className="eyebrow !text-fg">{g.label}</span>
                  <span className="num text-xs text-muted">
                    {g.count} jobs · {g.share}%
                  </span>
                </p>
                <ul className="divide-y divide-line/60">
                  {g.rows.map((r) => (
                    <li key={r.name} className="py-2.5 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <RoleButton name={r.name} onExplore={onExplore} />
                        <span className="num text-muted">
                          {r.count} · {r.share}%
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-[7.5rem_1fr_3rem] items-center gap-2 text-xs text-muted">
                        <span>Names Argentina</span>
                        <ScopeBar counts={r.scope} total={r.count} scopes={scopes} />
                        <span className="num text-right text-fg">{r.ar}%</span>
                        <span>In English</span>
                        <Meter value={r.en} color="#70b8d6" />
                        <span className="num text-right text-fg">{r.en}%</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <p className="mt-3 text-xs leading-relaxed text-subtle">
            “Names Argentina” = the posting lists Argentina explicitly, alone or among other
            countries (for example “Argentina, +44 countries”). “Worldwide” = remote with no country
            restriction. Every job in this report accepts candidates in Argentina by design. Role
            groups are a reading aid; they do not change the classification.
          </p>
        </Figure>
      )}
    </Section>
  )
}
