import { useMemo } from 'react'
import { skillMatrix, skillRoleShare } from '../../lib/analytics'
import type { JobFilters } from '../../lib/filters'
import { ROLE_COLORS } from '../../lib/format'
import type { Job, SkillsDoc } from '../../lib/types'
import { Figure, Section } from '../Section'
import { EmptyState } from '../States'

const SCALE_CAP = 60
const SCALE_STEPS = [0, 15, 30, 45, 60]
/** Short column headers so every role fits an equal-width column. */
const SHORT_ROLE: Record<string, string> = { Development: 'Dev', 'AI/Annotation': 'AI/Annot.' }
/** Dictionary entries that describe a task rather than a technology. */
const TASK_SKILLS: Record<string, string> = { 'Data Annotation': 'AI/Annotation' }

function heat(value: number): { background?: string; color: string } {
  if (value === 0) return { color: '#7f909d' }
  const alpha = 0.12 + (0.78 * Math.min(value, SCALE_CAP)) / SCALE_CAP
  return { background: `rgba(183, 227, 107, ${alpha})`, color: alpha > 0.5 ? '#101820' : '#e8eef2' }
}

export function SkillsSection({
  skills,
  jobs,
  onExplore,
}: {
  skills: SkillsDoc
  jobs: Job[]
  onExplore: (patch: Partial<JobFilters>) => void
}) {
  const limit = skills.top_n
  const m = useMemo(() => skillMatrix(jobs, limit, 3), [jobs, limit])
  const overall = useMemo(() => new Map(skills.overall.map((s) => [s.name, s])), [skills])
  const max = Math.max(...skills.overall.map((s) => s.pct), 1)
  const notes = Object.entries(TASK_SKILLS)
    .filter(([skill]) => m.skills.includes(skill))
    .map(([skill, role]) => ({ skill, role, ...skillRoleShare(jobs, skill, role) }))

  return (
    <Section
      id="skills"
      index="01"
      title="Which skills does the junior market ask for?"
      dek={
        <>
          Technologies detected in each posting&apos;s title, description and tags with a dictionary
          of 100+ skills. The first column ranks skills across all {jobs.length} active jobs; the
          other columns show how common each skill is inside each role type. Select a skill to see
          the postings that mention it.
        </>
      }
    >
      {m.skills.length === 0 ? (
        <EmptyState title="Not enough data for the skills matrix yet" />
      ) : (
        <Figure
          label={`Top ${limit} skills · % of jobs that mention each skill`}
          note="Role columns: role types with ≥ 3 jobs"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[43rem] table-fixed border-separate border-spacing-0.5 text-sm">
              <caption className="sr-only">
                Share of all active jobs, and of each role type&apos;s jobs, that mention each of
                the {limit} most requested skills
              </caption>
              <thead>
                <tr className="h-11">
                  <th
                    scope="col"
                    className="sticky left-0 z-10 w-44 bg-canvas pb-2 text-left align-bottom"
                  >
                    <span className="eyebrow font-medium">Skill</span>
                  </th>
                  <th scope="col" className="w-56 pb-2 pl-2 text-left align-bottom font-normal">
                    <span className="block text-xs text-fg">All roles</span>
                    <span className="num block text-[11px] text-subtle">n={jobs.length}</span>
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
                      <span className="num block text-[11px] text-subtle">
                        n={m.roleTotals[role]}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {m.skills.map((skill, i) => {
                  const all = overall.get(skill)
                  const share = all?.pct ?? 0
                  return (
                    <tr key={skill} className="h-10">
                      <th
                        scope="row"
                        className="sticky left-0 z-10 bg-canvas pr-3 text-left font-normal"
                      >
                        <button
                          type="button"
                          onClick={() => onExplore({ skill })}
                          className="group flex w-full min-w-0 items-center gap-2 text-left"
                          aria-label={`Show jobs that mention ${skill}`}
                        >
                          <span className="num w-5 shrink-0 text-xs text-subtle">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <span className="flex min-w-0 flex-col leading-tight">
                            <span className="truncate text-fg group-hover:text-accent group-hover:underline">
                              {skill}
                              {TASK_SKILLS[skill] && <sup className="ml-0.5 text-warn">*</sup>}
                            </span>
                            {all?.category && (
                              <span className="truncate font-mono text-[10px] text-subtle">
                                {all.category}
                              </span>
                            )}
                          </span>
                        </button>
                      </th>
                      <td className="pl-2">
                        <span className="flex items-center gap-2">
                          <span
                            className="relative block h-2 flex-1 rounded-[1px] bg-surface-2"
                            aria-hidden="true"
                          >
                            <span
                              className="absolute inset-y-0 left-0 rounded-[1px] bg-accent transition-[width] duration-500 ease-out"
                              style={{ width: `${(100 * share) / max}%` }}
                            />
                          </span>
                          <span className="num w-20 text-right text-xs text-muted">
                            {share}% <span className="text-subtle">({all?.count ?? 0})</span>
                          </span>
                        </span>
                      </td>
                      {m.roles.map((role) => {
                        const v = m.share[skill][role]
                        return (
                          <td
                            key={role}
                            className="num rounded-[2px] bg-surface px-2 text-right text-xs"
                            style={heat(v)}
                          >
                            <span className="sr-only">{role}: </span>
                            {v === 0 ? '·' : `${Math.round(v)}%`}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-col gap-3 text-xs text-subtle sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl space-y-1 leading-relaxed">
              {notes.map((n) => (
                <p key={n.skill}>
                  <span className="text-warn">*</span> {n.skill} describes a task rather than a
                  technology: {n.inRole} of its {n.total} mentions ({n.pct}%) are in {n.role} jobs.
                </p>
              ))}
              <p className="md:hidden">Scroll the table sideways to see every role type.</p>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-[11px]" aria-hidden="true">
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
          </div>
        </Figure>
      )}
    </Section>
  )
}
