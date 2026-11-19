/**
 * Pure, tested helpers that derive views from the exported snapshot.
 * Nothing here invents data: every value is a count or a share of real jobs.
 */
import type { Job, NamedCount, SourceCount, Summary } from './types'

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

/**
 * Presentation-only grouping of role types. It does not change any classification:
 * it separates core tech roles from AI data work and tech-adjacent roles so the report
 * does not present customer support as "the largest tech role".
 */
export const ROLE_GROUPS = [
  {
    key: 'core',
    label: 'Core tech',
    roles: ['Development', 'QA', 'Data', 'IT Support'],
    color: '#b7e36b',
  },
  { key: 'ai', label: 'AI data work', roles: ['AI/Annotation'], color: '#c49be0' },
  { key: 'adjacent', label: 'Tech-adjacent', roles: ['Admin/VA', 'Other'], color: '#94a7b6' },
] as const

export type RoleGroupKey = (typeof ROLE_GROUPS)[number]['key']

export interface RoleGroupCount {
  key: RoleGroupKey
  label: string
  color: string
  roles: readonly string[]
  count: number
  pct: number
}

export function roleGroups(roles: NamedCount[]): RoleGroupCount[] {
  const total = roles.reduce((s, r) => s + r.count, 0)
  return ROLE_GROUPS.map((g) => {
    const count = roles
      .filter((r) => (g.roles as readonly string[]).includes(r.name))
      .reduce((s, r) => s + r.count, 0)
    return {
      key: g.key,
      label: g.label,
      color: g.color,
      roles: g.roles,
      count,
      pct: pct(count, total),
    }
  })
}

export interface Concentration {
  name: string
  count: number
  pct: number
}

/** The source that supplies the largest share of active jobs. */
export function topSource(sources: SourceCount[], total: number): Concentration | null {
  if (sources.length === 0 || total === 0) return null
  const top = sources.reduce((a, b) => (b.count > a.count ? b : a))
  return { name: top.name, count: top.count, pct: pct(top.count, total) }
}

function mondayOf(iso: string): string {
  const d = new Date(iso)
  const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7))
  return day.toISOString().slice(0, 10)
}

export interface PeakNote {
  week: string
  weekCount: number
  day: string
  dayCount: number
  sources: string[]
}

/**
 * Explains the busiest week: if a single publication day holds at least half of it,
 * report that day and the boards behind it (often a batch upload, not market demand).
 */
export function peakNote(weekly: Summary['weekly'], jobs: Job[]): PeakNote | null {
  const { peak } = weekExtremes(weekly)
  if (!peak) return null
  const inWeek = jobs.filter((j) => mondayOf(j.published_at ?? j.first_seen_at) === peak.week)
  const byDay = new Map<string, Job[]>()
  for (const j of inWeek) {
    const day = (j.published_at ?? j.first_seen_at).slice(0, 10)
    byDay.set(day, [...(byDay.get(day) ?? []), j])
  }
  const [day, dayJobs] = [...byDay.entries()].sort((a, b) => b[1].length - a[1].length)[0] ?? []
  if (!day || !dayJobs || dayJobs.length < peak.count / 2) return null
  return {
    week: peak.week,
    weekCount: peak.count,
    day,
    dayCount: dayJobs.length,
    sources: [...new Set(dayJobs.map((j) => j.source))].sort(),
  }
}

/** Share of a skill's mentions that come from one role type (e.g. Data Annotation). */
export function skillRoleShare(jobs: Job[], skill: string, role: string) {
  const withSkill = jobs.filter((j) => j.skills.includes(skill))
  const inRole = withSkill.filter((j) => j.role_type === role).length
  return { total: withSkill.length, inRole, pct: pct(inRole, withSkill.length) }
}

const CSV_COLUMNS: (keyof Job)[] = [
  'title',
  'company',
  'role_type',
  'seniority',
  'language',
  'location_scope',
  'location',
  'skills',
  'source',
  'published_at',
  'url',
]

function csvCell(value: unknown): string {
  const text = Array.isArray(value) ? value.join('; ') : String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** RFC 4180 CSV of the given jobs, used by the explorer's export. */
export function toCsv(jobs: Job[]): string {
  const rows = jobs.map((job) => CSV_COLUMNS.map((c) => csvCell(job[c])).join(','))
  return [CSV_COLUMNS.join(','), ...rows].join('\n')
}
