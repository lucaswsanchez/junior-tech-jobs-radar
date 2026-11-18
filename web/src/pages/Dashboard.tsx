import { ExplorerSection } from '../components/report/Explorer'
import { Indicators, Lede, RunFunnel } from '../components/report/Overview'
import { RolesSection } from '../components/report/Roles'
import { SkillsSection } from '../components/report/Skills'
import { TrendSection } from '../components/report/Trend'
import { ErrorState, LoadingState } from '../components/States'
import { useSnapshot } from '../lib/useSnapshot'

export function Dashboard() {
  const { state, retry } = useSnapshot()

  if (state.status === 'loading') return <LoadingState />
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={retry} />

  const { summary, skills, jobs } = state.data
  return (
    <div className="space-y-14">
      <div className="space-y-8">
        <Lede data={state.data} />
        <Indicators data={state.data} />
        <RunFunnel data={state.data} />
      </div>
      <SkillsSection skills={skills} jobs={jobs.jobs} />
      <RolesSection roles={summary.by_role} jobs={jobs.jobs} />
      <TrendSection summary={summary} />
      <ExplorerSection jobs={jobs.jobs} />
    </div>
  )
}
