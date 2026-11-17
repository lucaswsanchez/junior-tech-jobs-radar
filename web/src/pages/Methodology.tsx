import type { ReactNode } from 'react'
import { formatDateTime } from '../lib/format'
import { useSnapshot } from '../lib/useSnapshot'

const REPO = 'https://github.com/lucaswsanchez/junior-tech-jobs-radar'

const REJECTION_LABELS: Record<string, string> = {
  duplicate: 'Duplicates across sources',
  seniority: 'Not junior / entry level',
  location: 'Not open to Argentina',
  not_tech: 'Not a tech role',
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="card p-6">
      <h2 id={`${id}-title`} className="text-lg font-semibold text-slate-900">
        {title}
      </h2>
      <div className="mt-3 space-y-3 leading-relaxed text-slate-700">{children}</div>
    </section>
  )
}

function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.85em] text-slate-800">
      {children}
    </code>
  )
}

function LastRunFunnel() {
  const { state } = useSnapshot()
  if (state.status !== 'ready' || !state.data.summary.last_run) return null
  const run = state.data.summary.last_run
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
      <p className="font-medium text-slate-900">
        Last run · {formatDateTime(run.finished_at)} · status <Code>{run.status}</Code>
      </p>
      <ul className="mt-2 space-y-1">
        <li>
          <span className="tabular-nums font-semibold">{run.fetched}</span> postings fetched
        </li>
        {Object.entries(run.rejected)
          .filter(([, n]) => n > 0)
          .map(([reason, n]) => (
            <li key={reason} className="text-slate-600">
              − <span className="tabular-nums">{n}</span> {REJECTION_LABELS[reason] ?? reason}
            </li>
          ))}
        <li>
          = <span className="tabular-nums font-semibold">{run.kept}</span> junior tech jobs kept (
          {run.inserted} new, {run.updated} updated)
        </li>
      </ul>
      {run.errors.length > 0 && (
        <p className="mt-2 text-amber-700">
          Sources that failed in this run: {run.errors.map((e) => e.source).join(', ')}
        </p>
      )}
    </div>
  )
}

export function Methodology() {
  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Methodology
        </h1>
        <p className="mt-2 text-slate-600">
          How the radar collects, filters and measures junior tech jobs. All the rules are
          deterministic and open source: you can read each one in the{' '}
          <a href={REPO} className="font-medium text-brand-700 underline">
            repository
          </a>
          .
        </p>
      </header>

      <Section id="pipeline" title="1. Pipeline">
        <p>
          A Python ETL runs every day at 10:00 UTC on GitHub Actions. It <strong>extracts</strong>{' '}
          postings from four public APIs, <strong>transforms</strong> them (filters and enrichment),{' '}
          <strong>loads</strong> them into PostgreSQL with an idempotent upsert, and exports three
          static JSON files that this dashboard reads. There is no backend server.
        </p>
        <LastRunFunnel />
      </Section>

      <Section id="sources" title="2. Sources">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <a className="text-brand-700 underline" href="https://www.getonbrd.com">
              Get on Board
            </a>{' '}
            — tech jobs in Latin America, with a structured seniority field.
          </li>
          <li>
            <a className="text-brand-700 underline" href="https://himalayas.app">
              Himalayas
            </a>{' '}
            — remote jobs, queried with the country filter set to Argentina.
          </li>
          <li>
            <a className="text-brand-700 underline" href="https://remotive.com">
              Remotive
            </a>{' '}
            — remote jobs with a candidate location field.
          </li>
          <li>
            <a className="text-brand-700 underline" href="https://remoteok.com">
              Remote OK
            </a>{' '}
            — remote jobs feed. As its API terms require, every job links back to its original
            posting and names the source.
          </li>
        </ul>
        <p>
          Only official public APIs are used (no HTML scraping). Requests carry an identifiable
          User-Agent and wait between calls. If one API fails, the others still run and the failure
          is recorded.
        </p>
      </Section>

      <Section id="filters" title="3. Filters">
        <p>
          <strong>Seniority.</strong> A structured seniority field from the source wins (e.g. Get on
          Board &quot;No experience&quot; / &quot;Junior&quot;, Himalayas &quot;Entry-level&quot;).
          Otherwise the title decides: <em>junior, jr, trainee, intern, entry level, graduate</em>{' '}
          keep the job; <em>senior, sr, lead, staff, principal, manager, head of</em> drop it.
          Without a title signal, the description must contain an explicit phrase such as
          &quot;entry-level&quot; or &quot;no experience required&quot;. Any job that asks for{' '}
          <strong>3 or more years</strong> of experience is dropped.
        </p>
        <p>
          <strong>Location.</strong> A job is kept when its location names Argentina, or when it is
          remote and open to LATAM / Latin America / the Americas, or worldwide. Remote jobs
          restricted to other countries (e.g. &quot;USA only&quot;) are dropped.
        </p>
        <p>
          <strong>Deduplication.</strong> The same title + company (lower-cased, accents and
          &quot;remote&quot; noise removed) seen on several boards is counted once.
        </p>
        <p>
          <strong>Tech relevance.</strong> Junior roles that are clearly outside tech (sales,
          marketing, finance, HR…) are excluded.
        </p>
      </Section>

      <Section id="classification" title="4. Classification and skills">
        <p>
          <strong>Role type</strong> comes from ordered title rules: AI/Annotation, QA, Admin/VA,
          Data, IT Support and Development, then source tags as a fallback, otherwise Other.
        </p>
        <p>
          <strong>Skills</strong> are detected with a dictionary of 100+ technologies and regular
          expressions with word boundaries, so <Code>Java</Code> does not match{' '}
          <Code>JavaScript</Code> and <Code>SQL</Code> does not match <Code>MySQL</Code>. Ambiguous
          names use stricter rules: <Code>Go</Code> and <Code>R</Code> only count as
          &quot;Golang&quot; or when they appear in a list of technologies, and <Code>React</Code>,{' '}
          <Code>Excel</Code> and <Code>Windows</Code> are case-sensitive to avoid matching
          &quot;react quickly&quot; or &quot;excel at&quot;.
        </p>
        <p>
          <strong>Language</strong> is English or Spanish, using the source field when available and
          otherwise comparing the frequency of common English and Spanish words.
        </p>
      </Section>

      <Section id="metrics" title="5. Metrics">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Active jobs</strong>: jobs seen by the pipeline in the last 7 days.
          </li>
          <li>
            <strong>New this week</strong>: active jobs published in the last 7 days.
          </li>
          <li>
            <strong>Skill share</strong>: percentage of active jobs (in the selected role type)
            whose title, description or tags mention the skill.
          </li>
          <li>
            <strong>Weekly trend</strong>: all tracked jobs grouped by the week they were published.
          </li>
        </ul>
      </Section>

      <Section id="limitations" title="6. Limitations">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            The radar covers four boards, not the whole market. LinkedIn and local boards that do
            not offer a public API are not included.
          </li>
          <li>
            Rules are keyword-based: some postings will be misclassified. The rules are covered by
            unit tests and tuned on real data, and improvements are welcome.
          </li>
          <li>Trends get more meaningful as daily history accumulates.</li>
        </ul>
      </Section>
    </article>
  )
}
