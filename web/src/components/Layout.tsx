import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

export const REPO_URL = 'https://github.com/lucaswsanchez/junior-tech-jobs-radar'

const SOURCES = [
  { name: 'Get on Board', url: 'https://www.getonbrd.com' },
  { name: 'Himalayas', url: 'https://himalayas.app' },
  { name: 'Remotive', url: 'https://remotive.com' },
  { name: 'RemoteOK', url: 'https://remoteok.com' },
  { name: 'Jobicy', url: 'https://jobicy.com' },
]

function Mark() {
  return (
    <svg viewBox="0 0 64 64" className="size-7" aria-hidden="true">
      <circle
        cx="32"
        cy="32"
        r="21"
        fill="none"
        stroke="#70B8D6"
        strokeOpacity=".45"
        strokeWidth="3"
      />
      <circle
        cx="32"
        cy="32"
        r="12"
        fill="none"
        stroke="#70B8D6"
        strokeOpacity=".7"
        strokeWidth="3"
      />
      <path d="M32 32 L49 17" stroke="#B7E36B" strokeWidth="4.5" strokeLinecap="round" />
      <circle cx="32" cy="32" r="4" fill="#B7E36B" />
      <circle cx="43" cy="41" r="4" fill="#B7E36B" />
    </svg>
  )
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  `relative py-4 text-sm transition-colors ${
    isActive
      ? 'text-fg after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-accent'
      : 'text-muted hover:text-fg'
  }`

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:bg-accent focus:px-3 focus:py-2 focus:text-canvas"
      >
        Skip to content
      </a>
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
          <NavLink
            to="/"
            className="flex items-center gap-2.5 py-3"
            aria-label="Junior Tech Jobs Radar, home"
          >
            <Mark />
            <span className="leading-none">
              <span className="block text-[15px] font-semibold tracking-tight">
                Junior Tech Jobs Radar
              </span>
              <span className="eyebrow mt-1 hidden !text-[10px] sm:block">
                LATAM labor market observatory
              </span>
            </span>
          </NavLink>
          <nav className="flex items-center gap-6" aria-label="Main">
            <NavLink to="/" end className={navClass}>
              Report
            </NavLink>
            <NavLink to="/methodology" className={navClass}>
              Methodology
            </NavLink>
            <a href={REPO_URL} className="hidden py-4 text-sm text-muted hover:text-fg sm:block">
              Source ↗
            </a>
          </nav>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        {children}
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 text-sm text-muted sm:px-6 md:grid-cols-3 lg:px-8">
          <div>
            <p className="eyebrow">Data sources</p>
            <ul className="mt-2 space-y-1">
              {SOURCES.map((s) => (
                <li key={s.name}>
                  <a href={s.url} className="hover:text-fg hover:underline">
                    {s.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="eyebrow">Attribution</p>
            <p className="mt-2 leading-relaxed">
              Public APIs only. Every posting links back to the board that published it.
            </p>
          </div>
          <div>
            <p className="eyebrow">Project</p>
            <p className="mt-2 leading-relaxed">
              Built by{' '}
              <a href="https://lucassanchez.netlify.app" className="text-fg hover:underline">
                Lucas Sanchez
              </a>
              . Open source on{' '}
              <a href={REPO_URL} className="text-fg hover:underline">
                GitHub
              </a>
              .
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
