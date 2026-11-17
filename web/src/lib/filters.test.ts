import { describe, expect, it } from 'vitest'
import { relativeDays } from './format'
import { ANY, EMPTY_FILTERS, filterJobs, normalize, uniqueValues } from './filters'
import type { Job } from './types'

function job(overrides: Partial<Job>): Job {
  return {
    id: 'x',
    title: 'Junior Python Developer',
    company: 'Acme',
    url: 'https://example.com',
    source: 'Himalayas',
    source_url: 'https://himalayas.app',
    location: 'Argentina',
    location_scope: 'Argentina',
    remote: true,
    role_type: 'Development',
    seniority: 'Junior',
    language: 'en',
    published_at: '2026-11-10T00:00:00Z',
    first_seen_at: '2026-11-10T00:00:00Z',
    skills: ['Python', 'SQL'],
    ...overrides,
  }
}

const jobs: Job[] = [
  job({ id: '1' }),
  job({
    id: '2',
    title: 'Analista QA Jr',
    company: 'Globant',
    role_type: 'QA',
    language: 'es',
    source: 'Get on Board',
    skills: ['Selenium'],
  }),
  job({ id: '3', title: 'Data Annotator', role_type: 'AI/Annotation', skills: [] }),
]

describe('filterJobs', () => {
  it('returns everything with empty filters', () => {
    expect(filterJobs(jobs, EMPTY_FILTERS)).toHaveLength(3)
  })

  it('filters by role, language and source', () => {
    expect(filterJobs(jobs, { ...EMPTY_FILTERS, role: 'QA' }).map((j) => j.id)).toEqual(['2'])
    expect(filterJobs(jobs, { ...EMPTY_FILTERS, language: 'es' }).map((j) => j.id)).toEqual(['2'])
    expect(filterJobs(jobs, { ...EMPTY_FILTERS, source: 'Himalayas' })).toHaveLength(2)
  })

  it('searches title, company and skills, ignoring case and accents', () => {
    expect(filterJobs(jobs, { ...EMPTY_FILTERS, query: 'selenium' }).map((j) => j.id)).toEqual([
      '2',
    ])
    expect(filterJobs(jobs, { ...EMPTY_FILTERS, query: 'GLOBANT' })).toHaveLength(1)
    expect(filterJobs(jobs, { ...EMPTY_FILTERS, query: 'análista' })).toHaveLength(1)
  })

  it('requires every search term to match', () => {
    expect(filterJobs(jobs, { ...EMPTY_FILTERS, query: 'python sql' })).toHaveLength(1)
    expect(filterJobs(jobs, { ...EMPTY_FILTERS, query: 'python selenium' })).toHaveLength(0)
  })

  it('combines filters', () => {
    const result = filterJobs(jobs, {
      query: 'junior',
      role: 'Development',
      language: 'en',
      source: ANY,
    })
    expect(result.map((j) => j.id)).toEqual(['1'])
  })
})

describe('helpers', () => {
  it('normalize strips accents', () => {
    expect(normalize('Análisis Técnico')).toBe('analisis tecnico')
  })

  it('uniqueValues returns sorted distinct values', () => {
    expect(uniqueValues(jobs, 'source')).toEqual(['Get on Board', 'Himalayas'])
  })

  it('relativeDays describes elapsed time', () => {
    const now = new Date('2026-11-17T12:00:00Z')
    expect(relativeDays('2026-11-17T08:00:00Z', now)).toBe('today')
    expect(relativeDays('2026-11-16T08:00:00Z', now)).toBe('yesterday')
    expect(relativeDays('2026-11-10T12:00:00Z', now)).toBe('7 days ago')
    expect(relativeDays(null, now)).toBe('—')
  })
})
