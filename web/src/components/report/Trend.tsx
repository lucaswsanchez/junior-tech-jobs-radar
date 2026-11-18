import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { pct, weekExtremes } from '../../lib/analytics'
import { formatWeek } from '../../lib/format'
import type { SourceCount, Summary } from '../../lib/types'
import { Figure, Section } from '../Section'

const AXIS = { fill: '#7f909d', fontSize: 11, fontFamily: 'IBM Plex Mono' }

function TooltipBox({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload: { week: string; count: number } }[]
}) {
  if (!active || !payload?.length) return null
  const { week, count } = payload[0].payload
  return (
    <div className="rounded-md border border-line bg-canvas px-3 py-2 text-xs shadow-lg">
      <p className="text-subtle">Week of {formatWeek(week)}</p>
      <p className="num mt-0.5 text-fg">{count} new postings</p>
    </div>
  )
}

function WeeklyTrend({ weekly }: { weekly: Summary['weekly'] }) {
  const { peak, average } = weekExtremes(weekly)
  return (
    <Figure
      label="New postings per week · last 12 weeks"
      note={
        <>
          avg <span className="num text-muted">{average}</span>/week
          {peak && (
            <>
              {' '}
              · peak <span className="num text-accent">{peak.count}</span> (wk of{' '}
              {formatWeek(peak.week)})
            </>
          )}
        </>
      }
    >
      <div
        className="h-64"
        role="img"
        aria-label={`Weekly new postings. Peak of ${peak?.count ?? 0} in the week of ${peak ? formatWeek(peak.week) : 'n/a'}; average ${average} per week.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weekly} margin={{ top: 20, right: 4, left: -24, bottom: 0 }}>
            <XAxis
              dataKey="week"
              tickFormatter={formatWeek}
              tickLine={false}
              axisLine={{ stroke: '#2a3b48' }}
              tick={AXIS}
              minTickGap={12}
            />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS} />
            <ReferenceLine y={average} stroke="#70b8d6" strokeDasharray="3 4" strokeOpacity={0.7} />
            <Tooltip content={<TooltipBox />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar dataKey="count" radius={[2, 2, 0, 0]} maxBarSize={36} isAnimationActive={false}>
              {weekly.map((w) => (
                <Cell key={w.week} fill={peak && w.week === peak.week ? '#b7e36b' : '#3b5566'} />
              ))}
              <LabelList
                dataKey="count"
                position="top"
                content={(props) => {
                  const { x, y, width, value } = props as {
                    x: number
                    y: number
                    width: number
                    value: number
                  }
                  if (!peak || value !== peak.count) return null
                  return (
                    <text
                      x={x + width / 2}
                      y={y - 6}
                      textAnchor="middle"
                      fill="#b7e36b"
                      fontSize={11}
                      fontFamily="IBM Plex Mono"
                    >
                      {value}
                    </text>
                  )
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-subtle">
        Bars group every job tracked by the pipeline by publication week. Dashed line: weekly
        average. History grows with each daily run, so early weeks only include postings that were
        still open on the first run.
      </p>
    </Figure>
  )
}

function SourcesTable({ sources, total }: { sources: SourceCount[]; total: number }) {
  return (
    <Figure label="Sources · active jobs">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            <th scope="col" className="eyebrow pb-2 font-medium">
              Board
            </th>
            <th scope="col" className="eyebrow pb-2 text-right font-medium">
              Jobs
            </th>
            <th scope="col" className="eyebrow w-24 pb-2 pl-3 font-medium">
              Share
            </th>
          </tr>
        </thead>
        <tbody>
          {sources.map((s) => {
            const share = pct(s.count, total)
            return (
              <tr key={s.name} className="border-b border-line/60 last:border-0">
                <td className="py-2.5">
                  {s.url ? (
                    <a href={s.url} className="hover:text-accent hover:underline">
                      {s.name}
                    </a>
                  ) : (
                    s.name
                  )}
                </td>
                <td className="num py-2.5 text-right text-muted">{s.count}</td>
                <td className="py-2.5 pl-3">
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 flex-1 rounded-[1px] bg-surface-2" aria-hidden="true">
                      <span
                        className="block h-full rounded-[1px] bg-accent-2"
                        style={{ width: `${Math.max(share, 1)}%` }}
                      />
                    </span>
                    <span className="num w-10 text-right text-xs text-subtle">{share}%</span>
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="mt-3 text-xs leading-relaxed text-subtle">
        Counts after filtering: boards publish many more postings, but most are not junior or not
        open to Argentina.
      </p>
    </Figure>
  )
}

export function TrendSection({ summary }: { summary: Summary }) {
  return (
    <Section
      id="trend"
      index="03"
      title="Market activity and coverage"
      dek="When the jobs were published and which boards they come from."
    >
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-5">
          <SourcesTable sources={summary.by_source} total={summary.totals.active_jobs} />
        </div>
        <div className="min-w-0 lg:col-span-7">
          <WeeklyTrend weekly={summary.weekly} />
        </div>
      </div>
    </Section>
  )
}
