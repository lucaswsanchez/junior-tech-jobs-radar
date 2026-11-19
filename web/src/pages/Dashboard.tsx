import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ExplorerSection } from '../components/report/Explorer'
import { Findings, Indicators, Lede, RunFunnel, SectionNav } from '../components/report/Overview'
import { RolesSection } from '../components/report/Roles'
import { SkillsSection } from '../components/report/Skills'
import { TrendSection } from '../components/report/Trend'
import { ErrorState, LoadingState } from '../components/States'
import { EMPTY_FILTERS, filtersFromParams, filtersToParams, type JobFilters } from '../lib/filters'
import { useSnapshot } from '../lib/useSnapshot'

export function Dashboard() {
  const { state, retry } = useSnapshot()
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => filtersFromParams(params), [params])

  const setFilters = useCallback(
    (next: JobFilters) =>
      setParams(filtersToParams(next), { replace: true, preventScrollReset: true }),
    [setParams],
  )

  /** Drill-down: any chart can open the explorer filtered to the data behind it. */
  const explore = useCallback(
    (patch: Partial<JobFilters>) => {
      setFilters({ ...EMPTY_FILTERS, ...patch })
      requestAnimationFrame(() =>
        document.getElementById('explorer')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      )
    },
    [setFilters],
  )

  if (state.status === 'loading') return <LoadingState />
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={retry} />

  const { summary, skills, jobs } = state.data
  return (
    <div className="space-y-14">
      <div className="space-y-6">
        <Lede data={state.data} />
        <Indicators data={state.data} />
        <Findings data={state.data} />
        <RunFunnel data={state.data} />
        <SectionNav />
      </div>
      <SkillsSection skills={skills} jobs={jobs.jobs} onExplore={explore} />
      <RolesSection roles={summary.by_role} jobs={jobs.jobs} onExplore={explore} />
      <TrendSection summary={summary} jobs={jobs.jobs} onExplore={explore} />
      <ExplorerSection jobs={jobs.jobs} filters={filters} onChange={setFilters} />
    </div>
  )
}
