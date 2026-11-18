import type { ReactNode } from 'react'

/** Numbered report section: "01 — Skills". Editorial hierarchy instead of boxed cards. */
export function Section({
  id,
  index,
  title,
  dek,
  aside,
  children,
}: {
  id: string
  index: string
  title: string
  dek?: ReactNode
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="border-t border-line pt-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="eyebrow">
            <span className="text-accent">{index}</span> / {id}
          </p>
          <h2 id={`${id}-title`} className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
            {title}
          </h2>
          {dek && <p className="mt-1.5 leading-relaxed text-muted">{dek}</p>}
        </div>
        {aside}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  )
}

/** Sub-block heading inside a section. */
export function Figure({
  label,
  note,
  children,
  className = '',
}: {
  label: string
  note?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <figure className={className}>
      <figcaption className="mb-3 flex items-baseline justify-between gap-3">
        <span className="eyebrow">{label}</span>
        {note && <span className="text-xs text-subtle">{note}</span>}
      </figcaption>
      {children}
    </figure>
  )
}

/** Segmented control used as an accessible radio group. */
export function Segmented({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: string[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1">
      {options.map((option) => {
        const active = option === value
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option)}
            className={`rounded-md border px-2.5 py-1 font-mono text-xs transition-colors ${
              active
                ? 'border-accent bg-accent text-canvas'
                : 'border-line text-muted hover:border-subtle hover:text-fg'
            }`}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}
