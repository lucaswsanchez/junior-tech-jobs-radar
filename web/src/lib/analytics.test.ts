import { describe, expect, it } from 'vitest'
import { crossTab, pct, runFunnel, skillMatrix, weekExtremes } from './analytics'
import type { Job, LastRun } from './types'

function job(overrides: Partial<Job>): Job {
  return {
    id: Math.random().toString(36),
    title: 'Junior Developer',
    company: 'Acme',
    url: 'https://example.com',
    source: 'Himalayas',
    source_url: null,
    location: 'Worldwide',
    location_scope: 'Worldwide',
    remote: true,
    role_type: 'Development',
    seniority: 'Junior',
    language: 'en',
    published_at: null,
    first_seen_at: '2026-11-10T00:00:00Z',
    skills: [],
    ...overrides,
  }
}

const jobs = [
  job({ skills: ['Python', 'SQL'] }),
  job({ skills: ['Python'], location_scope: 'Argentina', language: 'es' }),
  job({ skills: ['SQL'], role_type: 'Data' }),
  job({ skills: ['Excel'], role_type: 'Data', location_scope: 'Argentina' }),
  job({ skills: [], role_type: 'QA' }),
]

describe('pct', () => {
  it('rounds to one decimal and handles zero totals', () => {
    expect(pct(1, 3)).toBe(33.3)
    expect(pct(0, 0)).toBe(0)
  })
})

describe('crossTab', () => {
  it('counts every combination in the requested order', () => {
    const t = crossTab(
      jobs,
      'role_type',
      'location_scope',
      ['Development', 'QA', 'Data'],
      ['Argentina', 'Worldwide'],
    )
    expect(t.rows).toEqual(['Development', 'QA', 'Data'])
    expect(t.cols).toEqual(['Argentina', 'Worldwide'])
    expect(t.counts.Development).toEqual({ Argentina: 1, Worldwide: 1 })
    expect(t.counts.QA).toEqual({ Argentina: 0, Worldwide: 1 })
    expect(t.colTotals).toEqual({ Argentina: 2, Worldwide: 3 })
    expect(t.total).toBe(5)
  })
})

describe('skillMatrix', () => {
  it('computes the share of each role that mentions each top skill', () => {
    const m = skillMatrix(jobs, 2, 2)
    expect(m.skills).toEqual(['Python', 'SQL'])
    expect(m.roles).toEqual(['Development', 'Data']) // QA has only 1 job
    expect(m.share.Python.Development).toBe(100)
    expect(m.share.SQL.Data).toBe(50)
    expect(m.share.Python.Data).toBe(0)
  })
})

describe('weekExtremes', () => {
  it('finds the peak, the latest week and the average', () => {
    const weekly = [
      { week: '2026-11-02', count: 2 },
      { week: '2026-11-09', count: 6 },
      { week: '2026-11-16', count: 1 },
    ]
    expect(weekExtremes(weekly)).toEqual({
      peak: { week: '2026-11-09', count: 6 },
      latest: { week: '2026-11-16', count: 1 },
      average: 3,
    })
    expect(weekExtremes([]).peak).toBeNull()
  })
})

describe('runFunnel', () => {
  it('splits fetched postings into kept and rejection reasons', () => {
    const run = {
      fetched: 10,
      kept: 4,
      rejected: { seniority: 5, location: 1, duplicate: 0 },
    } as unknown as LastRun
    const steps = runFunnel(run)
    expect(steps.map((s) => s.key)).toEqual(['kept', 'seniority', 'location'])
    expect(steps.reduce((sum, s) => sum + s.count, 0)).toBe(10)
    expect(runFunnel(null)).toEqual([])
  })
})
