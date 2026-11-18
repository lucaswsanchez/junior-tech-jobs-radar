import type { ReactNode } from 'react'

function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-sm bg-surface-2 ${className}`} />
}

/** Skeleton shaped like the report: headline, indicator strip, ranking and matrix. */
export function LoadingState() {
  return (
    <div role="status" aria-live="polite" className="space-y-10">
      <span className="sr-only">Loading the latest market snapshot…</span>
      <div className="space-y-3">
        <Bar className="h-3 w-48" />
        <Bar className="h-10 w-full max-w-2xl" />
        <Bar className="h-4 w-full max-w-xl" />
      </div>
      <div className="grid grid-cols-2 gap-6 border-y border-line py-6 md:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="space-y-2">
            <Bar className="h-3 w-20" />
            <Bar className="h-8 w-16" />
          </div>
        ))}
      </div>
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-5">
          {Array.from({ length: 10 }, (_, i) => (
            <Bar key={i} className="h-4" />
          ))}
        </div>
        <Bar className="h-72 lg:col-span-7" />
      </div>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-xl border-l-2 border-warn py-2 pl-6">
      <p className="eyebrow !text-warn">Snapshot unavailable</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        The latest market data could not be loaded
      </h1>
      <p className="mt-2 leading-relaxed text-muted">
        The dashboard reads static files published by the daily pipeline. Check your connection and
        try again.
      </p>
      <pre className="mt-4 overflow-x-auto rounded-md bg-surface px-3 py-2 font-mono text-xs text-subtle">
        {message}
      </pre>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-canvas hover:brightness-110"
      >
        Retry
      </button>
    </div>
  )
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <svg viewBox="0 0 40 40" className="size-10 text-subtle" aria-hidden="true">
        <circle cx="20" cy="20" r="15" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="20" cy="20" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M20 20 L31 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <p className="font-medium">{title}</p>
      {children && <div className="max-w-sm text-sm text-muted">{children}</div>}
    </div>
  )
}
