'use client'

import { useMemo, useState } from 'react'
import { Chart, type ChartRule, type ChartSeries } from './Chart'
import { Card, EmptyState, SegmentedControl } from './ui'
import {
  RANGES,
  buildSeries,
  datesBetween,
  earliestDate,
  thin,
  windowFor,
  type Range,
} from '@/lib/chartSeries'
import { burnRate } from '@/lib/burnRate'
import { dayRecords, weekDates } from '@/lib/selectors'
import { trends } from '@/lib/trends'
import { useData } from '@/lib/store/provider'

/**
 * The three charts on Progress, under one range switcher.
 *
 * One switcher for all of them on purpose: the entire point of putting weight,
 * energy and macros on the same screen is comparing them over the *same* weeks,
 * and per-chart ranges would let them drift out of step without saying so.
 *
 * Everything defers to `Chart` for drawing and to `chartSeries` for the
 * arithmetic. What lives here is which series go on which chart, and the copy
 * that explains an empty one — because "no data yet" and "this feature is
 * broken" look identical unless you say which it is.
 */
export function ProgressCharts({ today }: { today: string }) {
  const { data } = useData()
  const [range, setRange] = useState<Range>('month')

  /*
   * The measured burn, when there is one, so this chart and the card above it
   * cannot quote different numbers for the same body. Same twelve-week window
   * and same exclusion of today as `BurnRateCard`.
   */
  const measured = useMemo(() => {
    const r = burnRate(
      trends({
        days: dayRecords(data, weekDates(today, 84).filter((d) => d < today)),
        weights: data.weights,
        targets: data.targets,
        profile: data.profile,
        goalWeightKg: data.profile.goalWeightKg,
        today,
      })
    )
    return r.ready ? r.observedKcal : null
  }, [data, today])

  const { dates, s } = useMemo(() => {
    const spanAll = datesBetween(
      windowFor('all', null, today).from,
      today
    )
    const first = earliestDate(dayRecords(data, spanAll), data.weights)
    const w = windowFor(range, first, today)
    const all = datesBetween(w.from, w.to)
    // Sixty points is about one per five pixels at 320 wide; past that the
    // marks merge and redrawing them just costs battery.
    const shown = thin(all, 60)
    return {
      dates: shown,
      s: buildSeries(dayRecords(data, shown), data.weights, data.profile, measured),
    }
  }, [data, range, today, measured])

  const has = (pick: (p: (typeof s.points)[number]) => number | null) =>
    s.points.some((p) => pick(p) !== null)

  const kcalFmt = (v: number) => `${Math.round(v).toLocaleString('en-GB')}`
  const kgFmt = (v: number) => `${Math.round(v * 10) / 10} kg`
  const gFmt = (v: number) => `${Math.round(v)} g`

  return (
    <>
      <div className="mb-3 px-4">
        <SegmentedControl
          label="Chart range"
          value={range}
          onChange={setRange}
          options={RANGES.map((r) => ({ value: r.value, label: r.label }))}
        />
      </div>

      <Card className="mb-4">
        <h2 className="mb-1 text-secondary font-bold">Weight</h2>
        <p className="mb-2 text-caption leading-relaxed text-faint">
          The heavy line is the average. Single readings swing 1–3% on water alone.
        </p>
        {s.weighIns < 2 ? (
          <EmptyState
            art="scales"
            title={s.weighIns === 0 ? 'No weigh-ins yet' : 'One reading so far'}
            hint="Two readings, a week or so apart, draw a trend"
          />
        ) : (
          <Chart
            ariaLabel="Weight over time"
            dates={dates}
            leftUnit="kg"
            rules={[
              {
                value: data.profile.goalWeightKg,
                label: `goal ${data.profile.goalWeightKg}kg`,
                colour: 'rgb(var(--avocado))',
              },
            ]}
            series={[
              {
                // --line is a border colour; against a white card the raw
                // readings all but vanished, which defeats showing them.
                id: 'reading',
                label: 'reading',
                colour: 'rgb(var(--primary) / 0.32)',
                values: s.points.map((p) => p.weightKg),
                format: kgFmt,
              },
              {
                id: 'avg',
                label: 'average',
                colour: 'rgb(var(--primary))',
                values: s.points.map((p) => p.weightAvgKg),
                format: kgFmt,
              },
            ]}
          />
        )}
      </Card>

      <Card className="mb-4">
        <h2 className="mb-1 text-secondary font-bold">Eaten against burned</h2>
        <p className="mb-2 text-caption leading-relaxed text-faint">
          Bars are what you logged. The line is what your body used &mdash;{' '}
          {measured === null
            ? 'estimated for the weight you were at the time'
            : 'measured from your own weight and diary'}
          , plus any exercise you logged. The gap between them is what moves the scale.
        </p>
        {!has((p) => p.kcal) ? (
          <EmptyState art="scales" title="Nothing logged in this range" hint="Log a day and it appears here" />
        ) : (
          <Chart
            ariaLabel="Calories eaten against calories burned"
            dates={dates}
            leftUnit="kcal"
            rules={
              [
                {
                  value: data.targets.kcal,
                  label: `target ${data.targets.kcal.toLocaleString('en-GB')}`,
                  colour: 'rgb(var(--amber))',
                },
              ] satisfies ChartRule[]
            }
            series={
              [
                {
                  id: 'eaten',
                  label: 'eaten',
                  colour: 'rgb(var(--primary) / 0.35)',
                  kind: 'bar',
                  values: s.points.map((p) => p.kcal),
                  format: kcalFmt,
                },
                ...(has((p) => p.burned)
                  ? [
                      {
                        id: 'burned',
                        label: 'burned',
                        colour: 'rgb(var(--ocean))',
                        values: s.points.map((p) => p.burned),
                        format: kcalFmt,
                      } as ChartSeries,
                    ]
                  : []),
              ] satisfies ChartSeries[]
            }
          />
        )}
        {!has((p) => p.burned) && (
          <p className="mt-1 text-caption leading-relaxed text-faint">
            Add your height and age in Settings and the burned line appears — without them
            there is no honest way to estimate it.
          </p>
        )}
      </Card>

      <Card className="mb-4">
        <h2 className="mb-1 text-secondary font-bold">Macros</h2>
        <p className="mb-2 text-caption leading-relaxed text-faint">
          Grams a day, against your targets. Protein is the one worth watching while losing.
        </p>
        {!has((p) => p.protein) ? (
          <EmptyState art="scales" title="Nothing logged in this range" hint="Log a day and it appears here" />
        ) : (
          <Chart
            ariaLabel="Protein, carbs, fat and fibre over time"
            dates={dates}
            leftUnit="g"
            /* The rule matches the series it is about. An avocado line
               labelled "protein target" next to a pink protein line reads as a
               fifth series rather than as protein's own target. */
            rules={[
              {
                value: data.targets.protein,
                label: `protein target ${data.targets.protein}g`,
                colour: 'rgb(var(--primary-ink))',
              },
            ]}
            series={[
              {
                id: 'protein',
                label: 'protein',
                colour: 'rgb(var(--primary))',
                values: s.points.map((p) => p.protein),
                format: gFmt,
              },
              {
                id: 'carbs',
                label: 'carbs',
                colour: 'rgb(var(--amber))',
                values: s.points.map((p) => p.carbs),
                format: gFmt,
              },
              {
                id: 'fat',
                label: 'fat',
                colour: 'rgb(var(--ocean))',
                values: s.points.map((p) => p.fat),
                format: gFmt,
              },
              {
                id: 'fibre',
                label: 'fibre',
                colour: 'rgb(var(--avocado))',
                values: s.points.map((p) => p.fibre),
                format: gFmt,
              },
            ]}
          />
        )}
      </Card>
    </>
  )
}
