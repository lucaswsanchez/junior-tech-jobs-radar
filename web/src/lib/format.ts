const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZoneName: 'short',
})

export function formatDate(iso: string | null | undefined): string {
  return iso ? dateFormatter.format(new Date(iso)) : '—'
}

export function formatDateTime(iso: string | null | undefined): string {
  return iso ? dateTimeFormatter.format(new Date(iso)) : '—'
}

/** "today", "yesterday", "5 days ago"... relative to `now`. */
export function relativeDays(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return '—'
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months === 1 ? '1 month ago' : `${months} months ago`
}

export function formatWeek(isoDate: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
    new Date(`${isoDate}T00:00:00`),
  )
}

export const LANGUAGE_LABELS: Record<string, string> = { en: 'English', es: 'Spanish' }

/** One color per role type, used consistently across charts and badges. */
export const ROLE_COLORS: Record<string, string> = {
  Development: '#0d9488',
  QA: '#6366f1',
  Data: '#f59e0b',
  'IT Support': '#0ea5e9',
  'AI/Annotation': '#d946ef',
  'Admin/VA': '#64748b',
  Other: '#94a3b8',
}
