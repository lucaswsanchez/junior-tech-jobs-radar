import type { Summary } from '../lib/types'

interface Kpi {
  label: string
  value: string
  hint: string
}

export function KpiCards({ summary }: { summary: Summary }) {
  const { totals } = summary
  const kpis: Kpi[] = [
    {
      label: 'Active junior jobs',
      value: totals.active_jobs.toLocaleString('en-US'),
      hint: `Seen in the last ${summary.active_window_days} days`,
    },
    {
      label: 'New this week',
      value: totals.new_last_7_days.toLocaleString('en-US'),
      hint: 'Published in the last 7 days',
    },
    {
      label: 'Posted in English',
      value: `${totals.pct_english}%`,
      hint: `${(100 - totals.pct_english).toFixed(1)}% in Spanish`,
    },
    {
      label: 'Sources',
      value: String(totals.sources),
      hint: `${totals.tracked_all_time.toLocaleString('en-US')} jobs tracked since launch`,
    },
  ]

  return (
    <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="card p-5">
          <dt className="text-sm font-medium text-slate-500">{kpi.label}</dt>
          <dd className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{kpi.value}</dd>
          <dd className="mt-1 text-xs text-slate-500">{kpi.hint}</dd>
        </div>
      ))}
    </dl>
  )
}
