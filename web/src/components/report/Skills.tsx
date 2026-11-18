import { useMemo, useState } from 'react'
import { skillMatrix } from '../../lib/analytics'
import { ROLE_COLORS } from '../../lib/format'
import type { Job, SkillsDoc } from '../../lib/types'
import { Figure, Section, Segmented } from '../Section'
import { EmptyState } from '../States'

const ALL = 'All roles'

function SkillRanking({ skills }: { skills: SkillsDoc }) {
  const [role, setRole] = useState(ALL)
  const roles = Object.keys(skills.by_role)
  const rows = role === ALL ? skills.overall : (skills.by_role[role] ?? [])
  const max = Math.max(...rows.map((r) => r.pct), 1)
  const color = role === ALL ? 'var(--color-accent)' : ROLE_COLORS[role]

  return (
    <Figure label={`Top ${skills.top_n} · share of ${role === ALL ? 'all' : role} jobs`}>
      <Segmented label="Role type" options={[ALL, ...roles]} value={role} onChange={setRole} />
      {rows.length === 0 ? (
        <EmptyState title="No skills detected for this role" />
      ) : (
        <ol className="mt-5 space-y-2.5">
          {rows.map((r, i) => (
            <li
              key={r.name}
              className="grid grid-cols-[1.5rem_7.5rem_1fr_3.25rem] items-center gap-2 text-sm sm:grid-cols-[1.5rem_9rem_1fr_3.5rem]"
            >
              <span className="num text-xs text-subtle">{String(i + 1).padStart(2, '0')}</span>
              <span className="truncate" title={`${r.name} · ${r.category} · ${r.count} jobs`}>
                {r.name}
              </span>
              <span className="relative h-2 rounded-[1px] bg-surface-2" aria-hidden="true">
                <span
                  className="absolute inset-y-0 left-0 rounded-[1px] transition-[width] duration-500 ease-out"
                  style={{ width: `${(100 * r.pct) / max}%`, background: color }}
                />
              </span>
              <span className="num text-right text-muted">
                {r.pct}
                <span className="text-subtle">%</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </Figure>
  )
}

function cellStyle(value: number): React.CSSProperties {
  if (value === 0) return {}
  const alpha = 0.12 + (0.78 * Math.min(value, 60)) / 60
  return { background: `rgba(183, 227, 107, ${alpha})`, color: alpha > 0.5 ? '#101820' : '#e8eef2' }
}

function SkillMatrixView({ jobs }: { jobs: Job[] }) {
  const m = useMemo(() => skillMatrix(jobs, 12, 3), [jobs])
  if (m.skills.length === 0 || m.roles.length === 0) {
    return <EmptyState title="Not enough data for the skills matrix yet" />
  }
  return (
    <Figure label="Skills × role type · % of each role's jobs" note="Roles with ≥ 3 jobs">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] border-separate border-spacing-0.5 text-sm">
          <caption className="sr-only">
            Share of jobs in each role type that mention each of the 12 most requested skills
          </caption>
          <thead>
            <tr>
              <th scope="col" className="w-32 text-left">
                <span className="sr-only">Skill</span>
              </th>
              {m.roles.map((role) => (
                <th key={role} scope="col" className="pb-2 text-left align-bottom font-normal">
                  <span className="flex items-center gap-1.5 text-xs text-muted">
                    <span
                      className="size-2 shrink-0 rounded-[1px]"
                      style={{ background: ROLE_COLORS[role] }}
                      aria-hidden="true"
                    />
                    {role}
                  </span>
                  <span className="num text-[11px] text-subtle">n={m.roleTotals[role]}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {m.skills.map((skill) => (
              <tr key={skill}>
                <th scope="row" className="pr-3 text-left font-normal whitespace-nowrap text-fg">
                  {skill}
                </th>
                {m.roles.map((role) => {
                  const v = m.share[skill][role]
                  return (
                    <td
                      key={role}
                      className="num h-8 rounded-[2px] bg-surface px-2 text-right text-xs text-subtle"
                      style={cellStyle(v)}
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
    </Figure>
  )
}

export function SkillsSection({ skills, jobs }: { skills: SkillsDoc; jobs: Job[] }) {
  return (
    <Section
      id="skills"
      index="01"
      title="Which skills does the junior market ask for?"
      dek="Technologies detected in each posting's title, description and tags with a dictionary of 100+ skills. Read the matrix across a row to see where a skill matters most."
    >
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <SkillRanking skills={skills} />
        </div>
        <div className="lg:col-span-7">
          <SkillMatrixView jobs={jobs} />
        </div>
      </div>
    </Section>
  )
}
