export interface NamedCount {
  name: string
  count: number
}

export interface SourceCount extends NamedCount {
  url: string | null
}

export interface LastRun {
  started_at: string | null
  finished_at: string | null
  status: 'running' | 'success' | 'partial' | 'failed'
  fetched: number
  kept: number
  inserted: number
  updated: number
  rejected: Record<string, number>
  source_stats: Record<string, { fetched: number; kept?: number }>
  errors: { source: string; error: string }[]
}

export interface Summary {
  generated_at: string
  active_window_days: number
  totals: {
    active_jobs: number
    new_last_7_days: number
    pct_english: number
    pct_remote: number
    sources: number
    tracked_all_time: number
  }
  by_role: NamedCount[]
  by_language: NamedCount[]
  by_location_scope: NamedCount[]
  by_seniority: NamedCount[]
  by_source: SourceCount[]
  weekly: { week: string; count: number }[]
  last_run: LastRun | null
}

export interface SkillCount {
  name: string
  category: string
  count: number
  pct: number
}

export interface SkillsDoc {
  generated_at: string
  top_n: number
  overall: SkillCount[]
  by_role: Record<string, SkillCount[]>
}

export interface Job {
  id: string
  title: string
  company: string
  url: string
  source: string
  source_url: string | null
  location: string
  location_scope: 'Argentina' | 'LATAM' | 'Worldwide'
  remote: boolean
  role_type: string
  seniority: string
  language: 'en' | 'es'
  published_at: string | null
  first_seen_at: string
  skills: string[]
}

export interface JobsDoc {
  generated_at: string
  count: number
  jobs: Job[]
}

export interface Snapshot {
  summary: Summary
  skills: SkillsDoc
  jobs: JobsDoc
}
