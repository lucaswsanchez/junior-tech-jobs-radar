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

/** Compact age for tables: "0d", "3d", "2mo". */
export function ageShort(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return '—'
  const days = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000))
  return days < 60 ? `${days}d` : `${Math.floor(days / 30)}mo`
}

export function formatWeek(isoDate: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
    new Date(`${isoDate}T00:00:00`),
  )
}

export const LANGUAGE_LABELS: Record<string, string> = { en: 'English', es: 'Spanish' }

export const SCOPE_LABELS: Record<string, string> = {
  Argentina: 'Names Argentina',
  LATAM: 'LATAM-wide',
  Worldwide: 'Worldwide',
}

/** Categorical palette tuned for the dark canvas; one color per role type everywhere. */
export const ROLE_COLORS: Record<string, string> = {
  Development: '#b7e36b',
  QA: '#70b8d6',
  Data: '#e3c46b',
  'IT Support': '#6bd6b0',
  'AI/Annotation': '#c49be0',
  'Admin/VA': '#94a7b6',
  Other: '#a3998a',
}

/** Eligibility uses a neutral ramp so it never reads as a role type color. */
export const SCOPE_COLORS: Record<string, string> = {
  Argentina: '#b4c3cd',
  LATAM: '#a3b1bc',
  Worldwide: '#6f8ea3',
}
