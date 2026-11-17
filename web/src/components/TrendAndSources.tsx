import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatWeek } from '../lib/format'
import type { SourceCount, Summary } from '../lib/types'

export function WeeklyTrend({ weekly }: { weekly: Summary['weekly'] }) {
  return (
    <section className="card p-5" aria-labelledby="trend-title">
      <h2 id="trend-title" className="text-base font-semibold text-slate-900">
        New postings per week
      </h2>
      <p className="text-sm text-slate-500">By publication date, last 12 weeks</p>
      <div className="mt-4 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={weekly} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#14b8a6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="week"
              tickFormatter={formatWeek}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#64748b', fontSize: 12 }}
              minTickGap={16}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#64748b', fontSize: 12 }}
            />
            <Tooltip
              labelFormatter={(label) => `Week of ${formatWeek(String(label))}`}
              formatter={(value) => [`${String(value)} jobs`, 'New postings']}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#0d9488"
              strokeWidth={2}
              fill="url(#trendFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

export function SourcesList({ sources, total }: { sources: SourceCount[]; total: number }) {
  return (
    <section className="card p-5" aria-labelledby="sources-title">
      <h2 id="sources-title" className="text-base font-semibold text-slate-900">
        Where the jobs come from
      </h2>
      <p className="text-sm text-slate-500">Active jobs per source</p>
      <ul className="mt-4 space-y-3">
        {sources.map((s) => {
          const pct = total ? Math.round((100 * s.count) / total) : 0
          return (
            <li key={s.name}>
              <div className="flex items-center justify-between text-sm">
                {s.url ? (
                  <a
                    href={s.url}
                    className="font-medium text-slate-700 hover:text-brand-700 hover:underline"
                  >
                    {s.name}
                  </a>
                ) : (
                  <span className="font-medium text-slate-700">{s.name}</span>
                )}
                <span className="tabular-nums text-slate-600">
                  {s.count} <span className="text-slate-400">({pct}%)</span>
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-slate-100" aria-hidden="true">
                <div
                  className="h-2 rounded-full bg-brand-500"
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
