'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Card } from './ui'
import { formatDay } from '@/lib/dates'
import { dayRecords, weekDates } from '@/lib/selectors'
import { trends, type Trend, type TrendWeek } from '@/lib/trends'
import { useData } from '@/lib/store/provider'

const kcal = (n: number) => Math.round(n).toLocaleString('en-GB')

/**
 * Two decimals, trimmed. A pace of 0.45 kg a week rounded to one decimal
 * becomes 0.5, which is an 11% overstatement of the thing this card exists to
 * report accurately.
 */
const kg = (n: number) => String(Math.round(Math.abs(n) * 100) / 100)

/**
 * Intake and weight on one axis, and the one number that connects them.
 *
 * Everything here is the app's own data; the value it adds is the comparison.
 * The wording around the gap between diary and scale is deliberate — see the
 * honesty notes at the top of lib/trends.ts. It is a calibration figure, and
 * naming measurement error before behaviour is not politeness, it is what the
 * evidence actually says.
 */
export function TrendCard({ today }: { today: string }) {
  const { data } = useData()

  const t = useMemo(
    () =>
      trends({
        // Twelve weeks back, and never today itself: a day still in progress
        // would drag every average down every morning.
        days: dayRecords(data, weekDates(today, 84).filter((d) => d < today)),
        weights: data.weights,
        targets: data.targets,
        profile: data.profile,
        goalWeightKg: data.profile.goalWeightKg,
        today,
      }),
    [data, today]
  )

  return (
    <Card className="mb-4">
      <h2 className="mb-1 text-secondary font-bold">Is it working?</h2>
      <p className="mb-3 text-caption leading-relaxed text-faint">
        What you ate, against what the scale did about it.
      </p>

      {t.weeks.some((w) => w.avgKcal !== null || w.weightKg !== null) && (
        <TrendChart weeks={t.weeks} targetKcal={data.targets.kcal} />
      )}

      {t.ready ? <Readout t={t} goalWeightKg={data.profile.goalWeightKg} /> : <Locked t={t} />}
    </Card>
  )
}

function Locked({ t }: { t: Trend }) {
  return (
    <div className="mt-2">
      <p className="text-body font-semibold">Not enough to say yet</p>
      <p className="mt-1 text-tertiary leading-relaxed text-muted">{t.needs}</p>
    </div>
  )
}

function Readout({ t, goalWeightKg }: { t: Trend; goalWeightKg: number }) {
  const rate = t.ratePerWeekKg ?? 0
  const direction = rate > 0.05 ? 'lost' : rate < -0.05 ? 'gained' : 'held'

  const measured =
    direction === 'held'
      ? `Across ${t.loggedDays} logged days you averaged ${kcal(t.avgIntakeKcal ?? 0)} kcal a day and your weight held steady.`
      : `Across ${t.loggedDays} logged days you averaged ${kcal(t.avgIntakeKcal ?? 0)} kcal a day and ${direction} about ${kg(rate)} kg a week.`

  return (
    <div className="mt-2 stack gap-3">
      <div className="grid grid-cols-2 gap-2">
        <Figure
          label="Measured pace"
          value={`${rate > 0 ? '-' : rate < 0 ? '+' : ''}${kg(rate)}`}
          unit="kg/wk"
        />
        <Figure
          label="Deficit that implies"
          value={t.impliedDeficitKcal === null ? '—' : kcal(Math.abs(t.impliedDeficitKcal))}
          unit="kcal/day"
        />
      </div>

      <p className="text-tertiary leading-relaxed text-muted">{measured}</p>
      <p className="text-tertiary leading-relaxed text-muted">{explain(t)}</p>

      {t.etaWeeks !== null && t.etaDate !== null && (
        <p className="text-tertiary leading-relaxed text-muted">
          At this pace that is about {t.etaWeeks} more{' '}
          {t.etaWeeks === 1 ? 'week' : 'weeks'} to {goalWeightKg} kg, around{' '}
          {formatDay(t.etaDate, { day: 'numeric', month: 'long', year: 'numeric' })}. A
          projection from the current slope, not a promise — the rate almost always slows as
          you get lighter.
        </p>
      )}

      {t.avgBurnedKcal > 0 && (
        <p className="text-caption leading-relaxed text-faint">
          Logged exercise averaged {kcal(t.avgBurnedKcal)} kcal a day across those days, and
          is counted as expenditure rather than taken off what you ate — so the diary figure
          above is what you burned plus training, minus what you logged.
        </p>
      )}

      <p className="text-caption leading-relaxed text-faint">
        Deficits here are converted at roughly 7,700 kcal per kilogram of fat. That is a rule
        of thumb rather than a measurement, and it flatters the numbers slightly in both
        directions.
      </p>

      {t.maintenanceKcal === null && (
        <Link
          href="/more/settings"
          className="tap inline-flex items-center text-tertiary font-semibold text-primary-ink underline decoration-primary-ink/30 underline-offset-4"
        >
          Add height and age for the comparison
        </Link>
      )}
    </div>
  )
}

function explain(t: Trend): string {
  const logged = t.loggedDeficitKcal === null ? null : kcal(Math.abs(t.loggedDeficitKcal))

  switch (t.reading) {
    case 'agrees':
      return (
        `Your diary predicted about ${logged} kcal a day, and the scale delivered it. The two ` +
        `sides of this app agree, which means the numbers you are seeing describe what is ` +
        `actually happening — you can plan from them.`
      )
    case 'slower_than_diary':
      return (
        `Your diary predicted about ${logged} kcal a day, and the scale is moving more slowly ` +
        `than that. The ordinary explanation is measurement, not effort: studies that check ` +
        `people against doubly-labelled water find intake under-reported by 20 to 30 percent ` +
        `almost across the board, careful people included, and the maintenance figure here is ` +
        `itself a formula's estimate of you. Weighing rice, oil and santan for one week ` +
        `usually closes most of the gap.`
      )
    case 'faster_than_diary':
      return (
        `Your diary predicted about ${logged} kcal a day and the scale is moving faster than ` +
        `that. Either you burn more than the formula credits you with, or some of the loss is ` +
        `water rather than fat. Nothing to correct — but if you are also tired, cold or ` +
        `constantly hungry, this is the point at which eating a little more is the right move.`
      )
    case 'stalled':
      return (
        `Your weight has been flat while the diary shows about ${logged} kcal a day of ` +
        `deficit. The likeliest reason is that the maintenance estimate is too high for you: ` +
        `Mifflin-St Jeor is a population average and real people sit either side of it by a ` +
        `few hundred calories. Portion sizes are the other candidate. Neither is a failure of ` +
        `willpower, and both are fixed by measuring rather than by eating less.`
      )
    default:
      return (
        `Add your height and age in Settings and this can compare the scale against what you ` +
        `burn, instead of only showing the pace.`
      )
  }
}

function Figure({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-xl bg-raised px-3 py-2">
      <p className="text-xl font-extrabold tabular-nums">
        {value}
        <span className="ml-0.5 text-caption font-semibold text-faint">{unit}</span>
      </p>
      <p className="text-caption font-semibold text-muted">{label}</p>
    </div>
  )
}

/**
 * Weekly intake as bars, trend weight as a line, on one week axis. Inline SVG
 * for the same reason the weight chart is: a dozen points do not justify a
 * charting library on a phone.
 */
function TrendChart({ weeks, targetKcal }: { weeks: TrendWeek[]; targetKcal: number }) {
  const w = 320
  const h = 148
  const pad = { top: 10, right: 8, bottom: 18, left: 8 }
  const innerW = w - pad.left - pad.right
  const innerH = h - pad.top - pad.bottom

  const kcals = weeks.map((k) => k.avgKcal).filter((v): v is number => v !== null)
  const kMax = Math.max(targetKcal, ...(kcals.length ? kcals : [targetKcal])) * 1.15
  const barW = (innerW / Math.max(1, weeks.length)) * 0.62

  const cx = (i: number) =>
    pad.left + (innerW / Math.max(1, weeks.length)) * (i + 0.5)
  const barY = (v: number) => pad.top + innerH * (1 - v / kMax)

  const kgs = weeks.map((k) => k.weightKg).filter((v): v is number => v !== null)
  const wMin = kgs.length ? Math.min(...kgs) - 0.4 : 0
  const wMax = kgs.length ? Math.max(...kgs) + 0.4 : 1
  const wSpan = wMax - wMin || 1
  const wy = (v: number) => pad.top + innerH * (1 - (v - wMin) / wSpan)

  const line = weeks
    .map((k, i) => (k.weightKg === null ? null : `${cx(i)},${wy(k.weightKg)}`))
    .filter((p): p is string => p !== null)

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full"
        role="img"
        aria-label="Weekly average intake against weight"
      >
        {weeks.map((k, i) =>
          k.avgKcal === null ? null : (
            <rect
              key={k.start}
              x={cx(i) - barW / 2}
              y={barY(k.avgKcal)}
              width={barW}
              height={pad.top + innerH - barY(k.avgKcal)}
              rx="3"
              fill="rgb(var(--amber) / 0.28)"
            />
          )
        )}
        <line
          x1={pad.left}
          x2={w - pad.right}
          y1={barY(targetKcal)}
          y2={barY(targetKcal)}
          stroke="rgb(var(--amber))"
          strokeWidth="1.25"
          strokeDasharray="4 4"
        />
        <text x={pad.left} y={barY(targetKcal) - 3} fontSize="8" fill="rgb(var(--amber))">
          target {kcal(targetKcal)}
        </text>

        {line.length > 1 && (
          <polyline
            points={line.join(' ')}
            fill="none"
            stroke="rgb(var(--primary))"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {weeks.map((k, i) =>
          k.weightKg === null ? null : (
            <circle
              key={`${k.start}-w`}
              cx={cx(i)}
              cy={wy(k.weightKg)}
              r="2.5"
              fill="rgb(var(--primary))"
            />
          )
        )}
        {weeks.map((k, i) =>
          i % 2 === 0 || weeks.length <= 6 ? (
            <text
              key={`${k.start}-l`}
              x={cx(i)}
              y={h - 5}
              fontSize="8"
              textAnchor="middle"
              fill="rgb(var(--faint))"
            >
              {formatDay(k.start, { day: 'numeric', month: 'short' })}
            </text>
          ) : null
        )}
      </svg>
      <p className="mt-1 text-caption text-faint">
        <span className="mr-1 inline-block h-2 w-3 rounded-[2px] bg-amber/30 align-middle" />
        average intake that week
        <span className="mx-1">&middot;</span>
        <span className="mr-1 inline-block h-[3px] w-3.5 rounded-pill bg-primary align-middle" />
        weight
      </p>
    </div>
  )
}
