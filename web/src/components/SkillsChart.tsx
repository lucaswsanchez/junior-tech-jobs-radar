import { useId, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ROLE_COLORS } from '../lib/format'
import type { SkillsDoc } from '../lib/types'
import { EmptyState } from './States'

const ALL = 'All roles'

export function SkillsChart({ skills }: { skills: SkillsDoc }) {
  const [role, setRole] = useState(ALL)
  const selectId = useId()
  const roles = Object.keys(skills.by_role)
  const data = role === ALL ? skills.overall : (skills.by_role[role] ?? [])
  const color = role === ALL ? '#0d9488' : (ROLE_COLORS[role] ?? '#0d9488')

  return (
    <section className="card p-5" aria-labelledby="skills-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="skills-title" className="text-base font-semibold text-slate-900">
            Top {skills.top_n} skills in demand
          </h2>
          <p className="text-sm text-slate-500">
            Share of active jobs that mention each technology
          </p>
        </div>
        <div>
          <label htmlFor={selectId} className="sr-only">
            Filter skills by role type
          </label>
          <select
            id={selectId}
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option>{ALL}</option>
            {roles.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      {data.length === 0 ? (
        <EmptyState title="No skills detected for this role yet" />
      ) : (
        <div className="mt-4" style={{ height: Math.max(220, data.length * 30) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ left: 8, right: 48, top: 0, bottom: 0 }}
            >
              <CartesianGrid horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" hide domain={[0, 'dataMax']} />
              <YAxis
                type="category"
                dataKey="name"
                width={130}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#334155', fontSize: 13 }}
              />
              <Tooltip
                cursor={{ fill: '#f1f5f9' }}
                formatter={(value, _name, item) => [
                  `${value} jobs (${(item.payload as { pct: number }).pct}%)`,
                  (item.payload as { category: string }).category,
                ]}
              />
              <Bar dataKey="count" fill={color} radius={[0, 6, 6, 0]} maxBarSize={22}>
                <LabelList
                  dataKey="pct"
                  position="right"
                  formatter={(v) => `${String(v)}%`}
                  style={{ fill: '#475569', fontSize: 12 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}
