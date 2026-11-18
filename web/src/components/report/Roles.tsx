import { useMemo } from 'react'
import { crossTab, pct } from '../../lib/analytics'
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
        .filter((s) => counts[s] > 0)
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

/** One table: role type × share × eligibility × language, rows in a single shared order. */
function RoleTable({ roles, jobs }: { roles: NamedCount[]; jobs: Job[] }) {
  const total = roles.reduce((s, r) => s + r.count, 0)
  const sorted = useMemo(() => [...roles].sort((a, b) => b.count - a.count), [roles])
  const scope = useMemo(
    () => crossTab(jobs, 'role_type', 'location_scope', [], SCOPE_ORDER),
    [jobs],
  )
  const lang = useMemo(() => crossTab(jobs, 'role_type', 'language', [], ['en', 'es']), [jobs])
  if (total === 0) return <EmptyState title="No active jobs" />
  const scopes = scope.cols
  const maxShare = Math.max(...sorted.map((r) => pct(r.count, total)))

  return (
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
      <div
        className="flex h-6 w-full overflow-hidden rounded-[2px]"
        role="img"
        aria-label={`Role type composition: ${sorted.map((r) => `${r.name} ${pct(r.count, total)}%`).join(', ')}`}
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

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[40rem] table-fixed text-sm">
          <caption className="sr-only">
            Active jobs per role type, with the share that names Argentina and the share written in
            English
          </caption>
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="eyebrow w-40 pb-2 text-left font-medium">
                Role type
              </th>
              <th scope="col" className="eyebrow w-14 pb-2 text-right font-medium">
                Jobs
              </th>
              <th scope="col" className="eyebrow pb-2 pl-6 text-left font-medium">
                Share of all jobs
              </th>
              <th scope="col" className="eyebrow pb-2 pl-6 text-left font-medium">
                Names Argentina
              </th>
              <th scope="col" className="eyebrow w-24 pb-2 text-right font-medium">
                In English
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const share = pct(r.count, total)
              const counts = scope.counts[r.name] ?? {}
              const en = lang.counts[r.name]?.en ?? 0
              return (
                <tr key={r.name} className="h-10 border-b border-line/60">
                  <td>
                    <span className="flex items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-[1px]"
                        style={{ background: ROLE_COLORS[r.name] }}
                        aria-hidden="true"
                      />
                      <span className="truncate">{r.name}</span>
                    </span>
                  </td>
                  <td className="num text-right text-muted">{r.count}</td>
                  <td className="pl-6">
                    <span className="flex items-center gap-3">
                      <Meter value={(100 * share) / maxShare} color={ROLE_COLORS[r.name]} />
                      <span className="num w-12 text-right">{share}%</span>
                    </span>
                  </td>
                  <td className="pl-6">
                    <span className="flex items-center gap-3">
                      <ScopeBar counts={counts} total={r.count} scopes={scopes} />
                      <span className="num w-12 text-right">
                        {pct(counts.Argentina ?? 0, r.count)}%
                      </span>
                    </span>
                  </td>
                  <td className="num text-right">{pct(en, r.count)}%</td>
                </tr>
              )
            })}
          </tbody>
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
              <td className="num text-right text-fg">{pct(lang.colTotals.en ?? 0, lang.total)}%</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-subtle">
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
      dek="Role type is classified from the job title. For each role: its share of the market, how many postings name Argentina explicitly and how many are written in English."
    >
      <RoleTable roles={roles} jobs={jobs} />
    </Section>
  )
}
