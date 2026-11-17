import { useCallback, useEffect, useState } from 'react'
import type { JobsDoc, SkillsDoc, Snapshot, Summary } from './types'

type State =
  { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: Snapshot }

async function getJson<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal })
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`)
  return (await response.json()) as T
}

/** Loads the three static JSON files exported by the pipeline. */
export function useSnapshot() {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      getJson<Summary>('/data/summary.json', controller.signal),
      getJson<SkillsDoc>('/data/skills.json', controller.signal),
      getJson<JobsDoc>('/data/jobs_latest.json', controller.signal),
    ])
      .then(([summary, skills, jobs]) =>
        setState({ status: 'ready', data: { summary, skills, jobs } }),
      )
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      })
    return () => controller.abort()
  }, [attempt])

  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  return { state, retry }
}
