import type { Job } from './types'

export const ANY = 'any'

export interface JobFilters {
  query: string
  role: string
  language: string
  source: string
}

export const EMPTY_FILTERS: JobFilters = { query: '', role: ANY, language: ANY, source: ANY }

/** Lowercase and strip accents so "analista" matches "Análista" and vice versa. */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

/** Every word of the query must appear in the title, company, location or skills. */
export function filterJobs(jobs: Job[], filters: JobFilters): Job[] {
  const terms = normalize(filters.query).split(/\s+/).filter(Boolean)
  return jobs.filter((job) => {
    if (filters.role !== ANY && job.role_type !== filters.role) return false
    if (filters.language !== ANY && job.language !== filters.language) return false
    if (filters.source !== ANY && job.source !== filters.source) return false
    if (terms.length === 0) return true
    const haystack = normalize(
      [job.title, job.company, job.location, job.skills.join(' ')].join(' '),
    )
    return terms.every((term) => haystack.includes(term))
  })
}

export function uniqueValues(jobs: Job[], key: 'role_type' | 'language' | 'source'): string[] {
  return [...new Set(jobs.map((job) => job[key]))].sort()
}
