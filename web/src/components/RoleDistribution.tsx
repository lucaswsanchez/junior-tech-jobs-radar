import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { ROLE_COLORS } from '../lib/format'
import type { NamedCount } from '../lib/types'
import { EmptyState } from './States'

export function RoleDistribution({ roles }: { roles: NamedCount[] }) {
  const total = roles.reduce((sum, r) => sum + r.count, 0)
  const sorted = [...roles].sort((a, b) => b.count - a.count)

  return (
    <section className="card p-5" aria-labelledby="roles-title">
      <h2 id="roles-title" className="text-base font-semibold text-slate-900">
        Jobs by role type
      </h2>
      <p className="text-sm text-slate-500">Classified from the job title</p>

      {total === 0 ? (
        <EmptyState title="No active jobs" />
      ) : (
        <>
          <div className="relative mx-auto mt-2 h-52 max-w-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sorted}
                  dataKey="count"
                  nameKey="name"
                  innerRadius="62%"
                  outerRadius="95%"
                  paddingAngle={2}
                  stroke="none"
                >
                  {sorted.map((r) => (
                    <Cell key={r.name} fill={ROLE_COLORS[r.name] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${String(value)} jobs`, '']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-slate-900">{total}</span>
              <span className="text-xs text-slate-500">jobs</span>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {sorted.map((r) => (
              <li key={r.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span
                    className="size-3 rounded-sm"
                    style={{ background: ROLE_COLORS[r.name] ?? '#94a3b8' }}
                    aria-hidden="true"
                  />
                  {r.name}
                </span>
                <span className="tabular-nums text-slate-600">
                  {r.count}{' '}
                  <span className="text-slate-400">({Math.round((100 * r.count) / total)}%)</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
