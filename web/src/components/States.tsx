import type { ReactNode } from 'react'

export function LoadingState() {
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <span className="sr-only">Loading dashboard data…</span>
      <div className="h-8 w-72 animate-pulse rounded bg-slate-200" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="card h-28 animate-pulse bg-slate-100" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card h-96 animate-pulse bg-slate-100 lg:col-span-2" />
        <div className="card h-96 animate-pulse bg-slate-100" />
      </div>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="card mx-auto max-w-lg p-8 text-center">
      <p className="text-4xl" aria-hidden="true">
        📡
      </p>
      <h2 className="mt-3 text-lg font-semibold text-slate-900">We couldn't load the job data</h2>
      <p className="mt-2 text-sm text-slate-600">
        The latest snapshot could not be fetched. Check your connection and try again.
      </p>
      <p className="mt-2 font-mono text-xs text-slate-400">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
      >
        Try again
      </button>
    </div>
  )
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <p className="text-3xl" aria-hidden="true">
        🔍
      </p>
      <p className="mt-2 font-medium text-slate-800">{title}</p>
      {children && <div className="mt-1 text-sm text-slate-500">{children}</div>}
    </div>
  )
}
