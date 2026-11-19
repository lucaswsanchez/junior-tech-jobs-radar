import type { Job } from './types'

export const ANY = 'any'

export interface JobFilters {
  query: string
  role: string
  language: string
  source: string
  skill: string
}

export const EMPTY_FILTERS: JobFilters = {
  query: '',
  role: ANY,
  language: ANY,
  source: ANY,
  skill: ANY,
}

/** URL query keys, so a filtered view can be shared or bookmarked. */
const PARAM_KEYS: Record<keyof JobFilters, string> = {
  query: 'q',
  role: 'role',
  language: 'lang',
  source: 'source',
  skill: 'skill',
}

/** Lowercase and strip accents so "analista" matches "Análista" and vice versa. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

/** Every word of the query must appear in the title, company, location or skills. */
export function filterJobs(jobs: Job[], filters: JobFilters): Job[] {
  const terms = normalize(filters.query).split(/\s+/).filter(Boolean)
  return jobs.filter((job) => {
    if (filters.role !== ANY && job.role_type !== filters.role) return false
    if (filters.language !== ANY && job.language !== filters.language) return false
    if (filters.source !== ANY && job.source !== filters.source) return false
    if (filters.skill !== ANY && !job.skills.includes(filters.skill)) return false
    if (terms.length === 0) return true
    const haystack = normalize(
      [job.title, job.company, job.location, job.skills.join(' ')].join(' '),
    )
    return terms.every((term) => haystack.includes(term))
  })
}

export function isFiltered(filters: JobFilters): boolean {
  return (Object.keys(EMPTY_FILTERS) as (keyof JobFilters)[]).some(
    (key) => filters[key] !== EMPTY_FILTERS[key],
  )
}

export function filtersFromParams(params: URLSearchParams): JobFilters {
  const filters = { ...EMPTY_FILTERS }
  for (const key of Object.keys(PARAM_KEYS) as (keyof JobFilters)[]) {
    const value = params.get(PARAM_KEYS[key])
    if (value) filters[key] = value
  }
  return filters
}

export function filtersToParams(filters: JobFilters): URLSearchParams {
  const params = new URLSearchParams()
  for (const key of Object.keys(PARAM_KEYS) as (keyof JobFilters)[]) {
    if (filters[key] !== EMPTY_FILTERS[key]) params.set(PARAM_KEYS[key], filters[key])
  }
  return params
}

export function uniqueValues(jobs: Job[], key: 'role_type' | 'language' | 'source'): string[] {
  return [...new Set(jobs.map((job) => job[key]))].sort()
}

export function uniqueSkills(jobs: Job[]): string[] {
  return [...new Set(jobs.flatMap((job) => job.skills))].sort((a, b) => a.localeCompare(b))
}
