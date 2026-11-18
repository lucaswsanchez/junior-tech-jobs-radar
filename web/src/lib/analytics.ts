/**
 * Pure, tested helpers that derive views from the exported snapshot.
 * Nothing here invents data: every value is a count or a share of real jobs.
 */
import type { Job, Summary } from './types'

export const ROLE_ORDER = [
  'Development',
  'QA',
  'Data',
  'IT Support',
  'AI/Annotation',
  'Admin/VA',
  'Other',
] as const

export function pct(part: number, total: number): number {
  return total ? Math.round((1000 * part) / total) / 10 : 0
}

export interface CrossTab {
  rows: string[]
  cols: string[]
  /** counts[row][col] */
  counts: Record<string, Record<string, number>>
  rowTotals: Record<string, number>
  colTotals: Record<string, number>
  total: number
}

type JobKey = 'role_type' | 'language' | 'location_scope' | 'source' | 'seniority'

function ordered(values: Iterable<string>, order: readonly string[] = []): string[] {
  const set = new Set(values)
  const known = order.filter((v) => set.has(v))
  const rest = [...set].filter((v) => !order.includes(v)).sort()
  return [...known, ...rest]
}

export function crossTab(
  jobs: Job[],
  rowKey: JobKey,
  colKey: JobKey,
  rowOrder: readonly string[] = [],
  colOrder: readonly string[] = [],
): CrossTab {
  const rows = ordered(
    jobs.map((j) => j[rowKey]),
    rowOrder,
  )
  const cols = ordered(
    jobs.map((j) => j[colKey]),
    colOrder,
  )
  const counts: CrossTab['counts'] = {}
  const rowTotals: Record<string, number> = {}
  const colTotals: Record<string, number> = {}
  for (const r of rows) counts[r] = Object.fromEntries(cols.map((c) => [c, 0]))
  for (const job of jobs) {
    counts[job[rowKey]][job[colKey]] += 1
    rowTotals[job[rowKey]] = (rowTotals[job[rowKey]] ?? 0) + 1
    colTotals[job[colKey]] = (colTotals[job[colKey]] ?? 0) + 1
  }
  return { rows, cols, counts, rowTotals, colTotals, total: jobs.length }
}

export interface SkillMatrix {
  skills: string[]
  roles: string[]
  /** share (0-100) of the role's jobs that mention the skill */
  share: Record<string, Record<string, number>>
  roleTotals: Record<string, number>
}

/** Top `limit` skills overall × role types that have at least `minJobs` jobs. */
export function skillMatrix(jobs: Job[], limit = 12, minJobs = 3): SkillMatrix {
  const overall = new Map<string, number>()
  for (const job of jobs) for (const s of job.skills) overall.set(s, (overall.get(s) ?? 0) + 1)
  const skills = [...overall.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([name]) => name)

  const roleTotals: Record<string, number> = {}
  for (const job of jobs) roleTotals[job.role_type] = (roleTotals[job.role_type] ?? 0) + 1
  const roles = ordered(Object.keys(roleTotals), ROLE_ORDER).filter((r) => roleTotals[r] >= minJobs)

  const share: SkillMatrix['share'] = {}
  for (const skill of skills) {
    share[skill] = {}
    for (const role of roles) {
      const n = jobs.filter((j) => j.role_type === role && j.skills.includes(skill)).length
      share[skill][role] = pct(n, roleTotals[role])
    }
  }
  return { skills, roles, share, roleTotals }
}

export interface WeekExtremes {
  peak: { week: string; count: number } | null
  latest: { week: string; count: number } | null
  average: number
}

export function weekExtremes(weekly: Summary['weekly']): WeekExtremes {
  if (weekly.length === 0) return { peak: null, latest: null, average: 0 }
  const peak = weekly.reduce((a, b) => (b.count > a.count ? b : a))
  const average = Math.round((10 * weekly.reduce((s, w) => s + w.count, 0)) / weekly.length) / 10
  return { peak: peak.count > 0 ? peak : null, latest: weekly[weekly.length - 1], average }
}

export interface FunnelStep {
  key: string
  label: string
  count: number
}

const REJECTION_LABELS: Record<string, string> = {
  duplicate: 'duplicates',
  seniority: 'not junior',
  location: 'not open to Argentina',
  not_tech: 'not tech',
}

/** Fetched postings split into rejection reasons and kept jobs (sums to `fetched`). */
export function runFunnel(run: Summary['last_run']): FunnelStep[] {
  if (!run || run.fetched === 0) return []
  const rejected = Object.entries(run.rejected)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({ key, label: REJECTION_LABELS[key] ?? key, count }))
  return [{ key: 'kept', label: 'Kept', count: run.kept }, ...rejected]
}
