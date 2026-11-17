import { KpiCards } from '../components/KpiCards'
import { RoleDistribution } from '../components/RoleDistribution'
import { SkillsChart } from '../components/SkillsChart'
import { ErrorState, LoadingState } from '../components/States'
import { SourcesList, WeeklyTrend } from '../components/TrendAndSources'
import { formatDateTime, relativeDays } from '../lib/format'
import type { Snapshot } from '../lib/types'
import { useSnapshot } from '../lib/useSnapshot'

function Header({ data }: { data: Snapshot }) {
  const updated = data.summary.last_run?.finished_at ?? data.summary.generated_at
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          The junior tech job market, open to Argentina
        </h1>
        <p className="mt-1 max-w-2xl text-slate-600">
          Entry-level and junior roles from public job boards that accept candidates based in
          Argentina, LATAM or anywhere. Refreshed automatically every day.
        </p>
      </div>
      <p className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600">
        <span
          className="mr-1.5 inline-block size-2 rounded-full bg-emerald-500"
          aria-hidden="true"
        />
        Last updated <time dateTime={updated}>{relativeDays(updated)}</time> ·{' '}
        <span className="text-slate-500">{formatDateTime(updated)}</span>
      </p>
    </div>
  )
}

export function Dashboard() {
  const { state, retry } = useSnapshot()

  if (state.status === 'loading') return <LoadingState />
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={retry} />

  const { summary, skills } = state.data
  return (
    <div className="space-y-6">
      <Header data={state.data} />
      <KpiCards summary={summary} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SkillsChart skills={skills} />
        </div>
        <RoleDistribution roles={summary.by_role} />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <WeeklyTrend weekly={summary.weekly} />
        </div>
        <SourcesList sources={summary.by_source} total={summary.totals.active_jobs} />
      </div>
    </div>
  )
}
