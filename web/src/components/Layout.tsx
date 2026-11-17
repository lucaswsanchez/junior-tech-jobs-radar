import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

const REPO_URL = 'https://github.com/lucaswsanchez/junior-tech-jobs-radar'

const SOURCES = [
  { name: 'Get on Board', url: 'https://www.getonbrd.com' },
  { name: 'Himalayas', url: 'https://himalayas.app' },
  { name: 'Remotive', url: 'https://remotive.com' },
  { name: 'Remote OK', url: 'https://remoteok.com' },
]

function Logo() {
  return (
    <svg viewBox="0 0 64 64" className="size-8" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#0f172a" />
      <circle
        cx="32"
        cy="32"
        r="20"
        fill="none"
        stroke="#14b8a6"
        strokeOpacity=".35"
        strokeWidth="3"
      />
      <circle
        cx="32"
        cy="32"
        r="11"
        fill="none"
        stroke="#14b8a6"
        strokeOpacity=".6"
        strokeWidth="3"
      />
      <path d="M32 32 L48 18" stroke="#2dd4bf" strokeWidth="4" strokeLinecap="round" />
      <circle cx="32" cy="32" r="3.5" fill="#2dd4bf" />
      <circle cx="44" cy="40" r="3.5" fill="#f59e0b" />
    </svg>
  )
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
  }`

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <header className="bg-ink text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <NavLink
            to="/"
            className="flex items-center gap-3"
            aria-label="Junior Tech Jobs Radar home"
          >
            <Logo />
            <span className="leading-tight">
              <span className="block text-sm font-semibold sm:text-base">
                Junior Tech Jobs Radar
              </span>
              <span className="block text-xs text-slate-400">Argentina &amp; LATAM</span>
            </span>
          </NavLink>
          <nav className="flex items-center gap-1" aria-label="Main">
            <NavLink to="/" end className={navClass}>
              Dashboard
            </NavLink>
            <NavLink to="/methodology" className={navClass}>
              Methodology
            </NavLink>
            <a
              href={REPO_URL}
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white sm:block"
            >
              GitHub
            </a>
          </nav>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            Data from{' '}
            {SOURCES.map((s, i) => (
              <span key={s.name}>
                <a
                  href={s.url}
                  className="font-medium text-slate-700 underline-offset-2 hover:underline"
                >
                  {s.name}
                </a>
                {i < SOURCES.length - 2 ? ', ' : i === SOURCES.length - 2 ? ' and ' : ''}
              </span>
            ))}{' '}
            public APIs. Every job links to its original posting.
          </p>
          <p>
            Built by{' '}
            <a
              href="https://lucassanchez.netlify.app"
              className="font-medium text-slate-700 hover:underline"
            >
              Lucas Sanchez
            </a>{' '}
            ·{' '}
            <a href={REPO_URL} className="font-medium text-slate-700 hover:underline">
              Source code
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
