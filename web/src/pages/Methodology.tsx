import type { ReactNode } from 'react'
import { REPO_URL } from '../components/Layout'
import { pct, ROLE_GROUPS, runFunnel } from '../lib/analytics'
import { formatDateTime } from '../lib/format'
import { useSnapshot } from '../lib/useSnapshot'

const SECTIONS = [
  { id: 'pipeline', title: 'Pipeline' },
  { id: 'sources', title: 'Sources' },
  { id: 'filters', title: 'Filters' },
  { id: 'classification', title: 'Classification & skills' },
  { id: 'metrics', title: 'Metrics' },
  { id: 'dictionary', title: 'Data dictionary' },
  { id: 'geography', title: 'Why no country comparison' },
  { id: 'limitations', title: 'Limitations' },
]

function Block({
  id,
  n,
  title,
  children,
}: {
  id: string
  n: number
  title: string
  children: ReactNode
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-6 border-t border-line pt-6"
    >
      <p className="eyebrow">
        <span className="text-accent">{String(n).padStart(2, '0')}</span>
      </p>
      <h2 id={`${id}-title`} className="mt-1 text-xl font-semibold tracking-tight">
        {title}
      </h2>
      <div className="mt-3 space-y-4 leading-relaxed text-muted [&_strong]:font-medium [&_strong]:text-fg">
        {children}
      </div>
    </section>
  )
}

function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-sm bg-surface px-1.5 py-0.5 font-mono text-[0.85em] text-fg">
      {children}
    </code>
  )
}

function A({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="text-accent-2 underline-offset-2 hover:underline">
      {children}
    </a>
  )
}

function Coverage() {
  const { state } = useSnapshot()
  if (state.status !== 'ready' || !state.data.summary.last_run) return null
  const { summary } = state.data
  const stats = summary.last_run?.source_stats ?? {}
  const active = new Map(summary.by_source.map((s) => [s.name, s.count]))
  const total = summary.totals.active_jobs
  const names = [...new Set([...Object.keys(stats), ...active.keys()])].sort(
    (a, b) => (active.get(b) ?? 0) - (active.get(a) ?? 0),
  )
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[32rem] text-sm">
        <caption className="eyebrow mb-2 text-left">Coverage by source · last run</caption>
        <thead>
          <tr className="border-b border-line text-left">
            <th scope="col" className="eyebrow pb-2 font-medium">
              Board
            </th>
            <th scope="col" className="eyebrow pb-2 text-right font-medium">
              Fetched
            </th>
            <th scope="col" className="eyebrow pb-2 text-right font-medium">
              Kept
            </th>
            <th scope="col" className="eyebrow pb-2 text-right font-medium">
              Keep rate
            </th>
            <th scope="col" className="eyebrow pb-2 text-right font-medium">
              Share of report
            </th>
          </tr>
        </thead>
        <tbody>
          {names.map((name) => {
            const fetched = stats[name]?.fetched ?? 0
            const kept = stats[name]?.kept ?? 0
            return (
              <tr key={name} className="border-b border-line/60">
                <th scope="row" className="py-2 text-left font-normal text-fg">
                  {name}
                </th>
                <td className="num py-2 text-right">{fetched}</td>
                <td className="num py-2 text-right">{kept}</td>
                <td className="num py-2 text-right">{pct(kept, fetched)}%</td>
                <td className="num py-2 text-right text-fg">
                  {pct(active.get(name) ?? 0, total)}%
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function LastRun() {
  const { state } = useSnapshot()
  if (state.status !== 'ready' || !state.data.summary.last_run) return null
  const run = state.data.summary.last_run
  const steps = runFunnel(run)
  return (
    <div className="border-l-2 border-accent bg-surface px-5 py-4">
      <p className="eyebrow">
        Last run · {formatDateTime(run.finished_at)} ·{' '}
        <span className="text-accent">{run.status}</span>
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-subtle">Fetched</dt>
          <dd className="num text-lg text-fg">{run.fetched}</dd>
        </div>
        {steps
          .filter((s) => s.key !== 'kept')
          .map((s) => (
            <div key={s.key}>
              <dt className="text-subtle first-letter:uppercase">{s.label}</dt>
              <dd className="num text-lg text-fg">−{s.count}</dd>
            </div>
          ))}
        <div>
          <dt className="text-subtle">Kept</dt>
          <dd className="num text-lg text-accent">
            {run.kept}{' '}
            <span className="text-xs text-subtle">
              ({run.inserted} new · {run.updated} updated)
            </span>
          </dd>
        </div>
      </dl>
      {run.errors.length > 0 && (
        <p className="mt-3 text-sm text-warn">
          Failed sources: {run.errors.map((e) => e.source).join(', ')}
        </p>
      )}
    </div>
  )
}

export function Methodology() {
  return (
    <div className="grid gap-10 lg:grid-cols-[13rem_1fr]">
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <p className="eyebrow">On this page</p>
        <ol className="mt-3 space-y-1.5 text-sm">
          {SECTIONS.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-muted hover:text-fg">
                <span className="num mr-2 text-subtle">{String(i + 1).padStart(2, '0')}</span>
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </aside>

      <article className="max-w-3xl space-y-10">
        <header>
          <p className="eyebrow">Transparency</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Methodology</h1>
          <p className="mt-3 text-lg leading-relaxed text-muted">
            How the radar collects, filters and measures junior tech jobs. Every rule is
            deterministic, unit-tested and open source in the <A href={REPO_URL}>repository</A>.
          </p>
        </header>

        <Block id="pipeline" n={1} title="Pipeline">
          <p>
            A Python ETL runs every day at 10:00 UTC on GitHub Actions. It <strong>extracts</strong>{' '}
            postings from four public APIs, <strong>transforms</strong> them (filters and
            enrichment), <strong>loads</strong> them into PostgreSQL with an idempotent upsert and
            exports three static JSON files that this site reads. There is no backend server.
          </p>
          <LastRun />
        </Block>

        <Block id="sources" n={2} title="Sources">
          <ul className="space-y-2">
            <li>
              <A href="https://www.getonbrd.com">Get on Board</A>: tech jobs in Latin America, with
              a structured seniority field.
            </li>
            <li>
              <A href="https://himalayas.app">Himalayas</A>: remote jobs, queried with the country
              filter set to Argentina.
            </li>
            <li>
              <A href="https://remotive.com">Remotive</A>: remote jobs with a candidate location
              field.
            </li>
            <li>
              <A href="https://remoteok.com">RemoteOK</A>: remote jobs feed. As its API terms
              require, every job links back to its original posting and names the source.
            </li>
          </ul>
          <p>
            Only official public APIs are used (no HTML scraping). Requests carry an identifiable
            User-Agent and wait between calls. If one API fails, the others still run and the
            failure is recorded.
          </p>
          <Coverage />
          <p>
            <strong>Source concentration.</strong> Most of the report comes from one board: it is
            the only source queried directly for Argentina, and it labels seniority. Shares in the
            report therefore describe that board&apos;s junior listings more than the whole market.
            The dashboard states this next to the headline figures.
          </p>
        </Block>

        <Block id="filters" n={3} title="Filters">
          <p>
            <strong>Seniority.</strong> A structured seniority field from the source wins (Get on
            Board “No experience” / “Junior”, Himalayas “Entry-level”). Otherwise the title decides:{' '}
            <em>junior, jr, trainee, intern, entry level, graduate</em> keep the job;{' '}
            <em>senior, sr, lead, staff, principal, manager, head of</em> drop it. Without a title
            signal, the description must contain an explicit phrase such as “entry-level” or “no
            experience required”. Any job that asks for <strong>3 or more years</strong> of
            experience is dropped.
          </p>
          <p>
            <strong>Location.</strong> A job is kept when its location names Argentina, or when it
            is remote and open to LATAM / Latin America / the Americas, or worldwide. Remote jobs
            restricted to other countries (e.g. “USA only”) are dropped.
          </p>
          <p>
            <strong>Deduplication.</strong> The same title + company (lower-cased, accents and
            “remote” noise removed) seen on several boards is counted once.
          </p>
          <p>
            <strong>Tech relevance.</strong> Junior roles that are clearly outside tech (sales,
            marketing, finance, HR…) are excluded.
          </p>
        </Block>

        <Block id="classification" n={4} title="Classification & skills">
          <p>
            <strong>Role type</strong> comes from ordered title rules (AI/Annotation, QA, Admin/VA,
            Data, IT Support, Development), then source tags as a fallback, otherwise Other.
          </p>
          <p>
            <strong>Role groups</strong> are a reading aid on top of the role types and do not
            change the classification:{' '}
            {ROLE_GROUPS.map((g, i) => (
              <span key={g.key}>
                {i > 0 && '; '}
                <em>{g.label}</em> = {g.roles.join(', ')}
              </span>
            ))}
            . Admin/VA (customer support, virtual assistants) passes the tech filter because those
            postings name tech tools, so it is reported as tech-adjacent rather than as core tech.
          </p>
          <p>
            <strong>Skills</strong> are detected with a dictionary of 100+ technologies and regular
            expressions with word boundaries, so <Code>Java</Code> does not match{' '}
            <Code>JavaScript</Code> and <Code>SQL</Code> does not match <Code>MySQL</Code>.
            Ambiguous names use stricter rules: <Code>Go</Code> and <Code>R</Code> only count as
            “Golang” or inside a list of technologies, and <Code>React</Code>, <Code>Excel</Code>{' '}
            and <Code>Windows</Code> are case-sensitive to avoid matching “react quickly” or “excel
            at”.
          </p>
          <p>
            <strong>Language</strong> is English or Spanish, from the source field when available,
            otherwise by comparing the frequency of common English and Spanish words.
          </p>
          <p>
            Some dictionary entries describe a task rather than a technology (for example{' '}
            <Code>Data Annotation</Code>). The skills matrix flags them and shows how concentrated
            they are in a single role type.
          </p>
        </Block>

        <Block id="metrics" n={5} title="Metrics">
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {[
              ['Active jobs', 'Jobs seen by the pipeline in the last 7 days.'],
              ['New this week', 'Active jobs published in the last 7 days.'],
              [
                'Skill share (All roles)',
                'Percentage of all active jobs that mention the skill, with the job count in brackets.',
              ],
              [
                'Skills × role matrix',
                'For each role type with at least 3 jobs, the share of its jobs that mention each of the 15 most requested skills.',
              ],
              [
                'Eligibility',
                '“Names Argentina” if the location lists Argentina; “Worldwide” if remote with no country restriction.',
              ],
              [
                'Posting dates',
                'Active jobs grouped by publication week. It is a snapshot of open postings, not a time series: closed postings are not included. A week dominated by one publication day is flagged as a batch upload.',
              ],
              [
                'Funnel',
                'Raw postings fetched in the last run, minus each rejection reason, equals the jobs in the report.',
              ],
            ].map(([term, def]) => (
              <div key={term}>
                <dt className="font-medium text-fg">{term}</dt>
                <dd className="mt-0.5 text-sm">{def}</dd>
              </div>
            ))}
          </dl>
        </Block>

        <Block id="dictionary" n={6} title="Data dictionary">
          <p>
            Fields of <Code>jobs_latest.json</Code>, the file behind the explorer and its CSV
            export. Aggregates live in <Code>summary.json</Code> and <Code>skills.json</Code>.
          </p>
          <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            {[
              ['title, company, url', 'As published by the source; url is the original posting.'],
              ['source', 'Board the posting was fetched from.'],
              ['role_type', 'Development, QA, Data, IT Support, AI/Annotation, Admin/VA or Other.'],
              ['seniority', 'Entry level or Junior (everything else is filtered out).'],
              ['language', 'en or es.'],
              ['location', 'Location text from the source (normalized).'],
              [
                'location_scope',
                'Argentina (named explicitly), LATAM or Worldwide (remote, no country restriction).',
              ],
              ['remote', 'True when the source marks the job as remote.'],
              ['skills', 'Technologies detected by the skill dictionary.'],
              [
                'published_at / first_seen_at',
                'Publication date at the source / first time the pipeline saw it (UTC).',
              ],
            ].map(([term, def]) => (
              <div key={term}>
                <dt className="font-mono text-xs text-fg">{term}</dt>
                <dd className="mt-0.5">{def}</dd>
              </div>
            ))}
          </dl>
        </Block>

        <Block id="geography" n={7} title="Why no country comparison">
          <p>
            The radar answers one question: which junior tech jobs can a candidate based in
            Argentina apply to? Every posting in the report passes that filter, so a country
            breakdown would compare a pre-filtered sample with itself. Sources also list eligible
            countries inconsistently (a single country, a region or “+44 countries”), which does not
            support a reliable per-country count. A map would therefore be decorative, so the report
            shows eligibility (names Argentina vs worldwide) instead. Querying each LATAM country
            separately is on the roadmap.
          </p>
        </Block>

        <Block id="limitations" n={8} title="Limitations">
          <ul className="list-disc space-y-1.5 pl-5 marker:text-subtle">
            <li>
              Four boards are covered, not the whole market. LinkedIn and local boards without a
              public API are not included.
            </li>
            <li>
              One board supplies most postings, so results reflect its listings more than the whole
              market.
            </li>
            <li>
              The report is a snapshot of open postings; trends over time need the daily history
              that the pipeline is now accumulating.
            </li>
            <li>
              Rules are keyword-based: some postings will be misclassified. They are covered by unit
              tests and tuned on real data.
            </li>
            <li>Trends become more meaningful as daily history accumulates.</li>
          </ul>
        </Block>
      </article>
    </div>
  )
}
