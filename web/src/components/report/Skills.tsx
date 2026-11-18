import { useId, useMemo, useState } from 'react'
import { skillMatrix } from '../../lib/analytics'
import { ROLE_COLORS } from '../../lib/format'
import type { Job, SkillsDoc } from '../../lib/types'
import { Figure, Section } from '../Section'
import { EmptyState } from '../States'

const ALL = 'All roles'
/** Shared table geometry so ranking rows line up with matrix rows. */
const TABLE = 'w-full table-fixed border-separate border-spacing-0.5 text-sm'
const HEAD_ROW = 'h-11'
const BODY_ROW = 'h-8'
const SCALE_CAP = 60
const SCALE_STEPS = [0, 15, 30, 45, 60]
/** Short column headers so every role fits an equal-width column. */
const SHORT_ROLE: Record<string, string> = { Development: 'Dev', 'AI/Annotation': 'AI/Annot.' }

function heat(value: number): { background?: string; color: string } {
  if (value === 0) return { color: '#7f909d' }
  const alpha = 0.12 + (0.78 * Math.min(value, SCALE_CAP)) / SCALE_CAP
  return { background: `rgba(183, 227, 107, ${alpha})`, color: alpha > 0.5 ? '#101820' : '#e8eef2' }
}

function SkillRanking({ skills }: { skills: SkillsDoc }) {
  const [role, setRole] = useState(ALL)
  const selectId = useId()
  const roles = Object.keys(skills.by_role)
  const rows = role === ALL ? skills.overall : (skills.by_role[role] ?? [])
  const max = Math.max(...rows.map((r) => r.pct), 1)
  const color = role === ALL ? 'var(--color-accent)' : ROLE_COLORS[role]

  const filter = (
    <span className="flex items-center gap-2">
      <label htmlFor={selectId} className="sr-only">
        Rank skills within a role type
      </label>
      <select
        id={selectId}
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="field h-8 py-0 font-mono text-xs"
      >
        <option>{ALL}</option>
        {roles.map((r) => (
          <option key={r}>{r}</option>
        ))}
      </select>
    </span>
  )

  return (
    <Figure label={`Top ${skills.top_n} · share of jobs`} note={filter}>
      {rows.length === 0 ? (
        <EmptyState title="No skills detected for this role" />
      ) : (
        <table className={TABLE}>
          <caption className="sr-only">
            Most requested skills in {role === ALL ? 'all active jobs' : `${role} jobs`}
          </caption>
          <thead>
            <tr className={HEAD_ROW}>
              <th scope="col" className="eyebrow w-7 pb-2 text-left align-bottom font-medium">
                #
              </th>
              <th
                scope="col"
                className="eyebrow w-28 pb-2 text-left align-bottom font-medium sm:w-36"
              >
                Skill
              </th>
              <th scope="col" className="eyebrow pb-2 text-left align-bottom font-medium">
                {role === ALL ? 'All roles' : role}
              </th>
              <th scope="col" className="eyebrow w-14 pb-2 text-right align-bottom font-medium">
                Share
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.name} className={BODY_ROW}>
                <td className="num text-xs text-subtle">{String(i + 1).padStart(2, '0')}</td>
                <td className="truncate" title={`${r.name} · ${r.category} · ${r.count} jobs`}>
                  {r.name}
                </td>
                <td>
                  <span
                    className="relative block h-2 rounded-[1px] bg-surface-2"
                    aria-hidden="true"
                  >
                    <span
                      className="absolute inset-y-0 left-0 rounded-[1px] transition-[width] duration-500 ease-out"
                      style={{ width: `${(100 * r.pct) / max}%`, background: color }}
                    />
                  </span>
                </td>
                <td className="num text-right text-muted">
                  {r.pct}
                  <span className="text-subtle">%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Figure>
  )
}

function SkillMatrixView({ jobs, limit }: { jobs: Job[]; limit: number }) {
  const m = useMemo(() => skillMatrix(jobs, limit, 3), [jobs, limit])
  if (m.skills.length === 0 || m.roles.length === 0) {
    return <EmptyState title="Not enough data for the skills matrix yet" />
  }
  return (
    <Figure label="Skills × role type · % of each role's jobs" note="Roles with ≥ 3 jobs">
      <div className="overflow-x-auto">
        <table className={`${TABLE} min-w-[36rem]`}>
          <caption className="sr-only">
            Share of jobs in each role type that mention each of the {limit} most requested skills
          </caption>
          <thead>
            <tr className={HEAD_ROW}>
              <th scope="col" className="w-36 pb-2 text-left align-bottom">
                <span className="eyebrow font-medium">Skill</span>
              </th>
              {m.roles.map((role) => (
                <th
                  key={role}
                  scope="col"
                  className="pb-2 text-left align-bottom font-normal"
                  title={role}
                >
                  <span className="flex items-center gap-1.5 text-xs text-muted">
                    <span
                      className="size-2 shrink-0 rounded-[1px]"
                      style={{ background: ROLE_COLORS[role] }}
                      aria-hidden="true"
                    />
                    <abbr title={role} className="truncate no-underline">
                      {SHORT_ROLE[role] ?? role}
                    </abbr>
                  </span>
                  <span className="num block text-[11px] text-subtle">n={m.roleTotals[role]}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {m.skills.map((skill) => (
              <tr key={skill} className={BODY_ROW}>
                <th scope="row" className="truncate pr-3 text-left font-normal text-fg">
                  {skill}
                </th>
                {m.roles.map((role) => {
                  const v = m.share[skill][role]
                  return (
                    <td
                      key={role}
                      className="num rounded-[2px] bg-surface px-2 text-right text-xs"
                      style={heat(v)}
                    >
                      {v === 0 ? '·' : `${Math.round(v)}%`}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div
        className="mt-3 flex items-center justify-end gap-2 text-[11px] text-subtle"
        aria-hidden="true"
      >
        <span>Share of role</span>
        {SCALE_STEPS.map((step) => (
          <span key={step} className="flex items-center gap-1">
            <span
              className="inline-block h-3 w-5 rounded-[2px] bg-surface"
              style={step === 0 ? undefined : { background: heat(step).background }}
            />
            <span className="num">
              {step}
              {step === SCALE_CAP ? '%+' : '%'}
            </span>
          </span>
        ))}
      </div>
    </Figure>
  )
}

export function SkillsSection({ skills, jobs }: { skills: SkillsDoc; jobs: Job[] }) {
  return (
    <Section
      id="skills"
      index="01"
      title="Which skills does the junior market ask for?"
      dek="Technologies detected in each posting's title, description and tags with a dictionary of 100+ skills. With “All roles” selected, each ranking row lines up with the same skill in the matrix."
    >
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-5">
          <SkillRanking skills={skills} />
        </div>
        <div className="min-w-0 lg:col-span-7">
          <SkillMatrixView jobs={jobs} limit={skills.top_n} />
        </div>
      </div>
    </Section>
  )
}
