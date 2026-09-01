'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, ListGroup, PageHeader, StatusPill } from '@/components/ui'
import { insights } from '@/lib/insights'
import { Icon } from '@/components/icons'
import { TrendCard } from '@/components/TrendCard'
import { ProgressCharts } from '@/components/ProgressCharts'
import { PickRail } from '@/components/PickRail'
import { round1, statusBand } from '@/lib/nutrition'
import { dayRecords, latestWeight, weekDates, weekOf } from '@/lib/selectors'
import { formatDay } from '@/lib/dates'
import { useData } from '@/lib/store/provider'
import { todayIso } from '@/lib/store/defaults'
import type { WeightLog } from '@/lib/types'

export default function ProgressPage() {
  const { data, ready, update } = useData()
  const [input, setInput] = useState('')
  const today = todayIso()

  const latest = latestWeight(data)

  // Observations run over the last four weeks of *logged* days, never planned
  // ones, so a week filled in ahead can't skew them.
  const loggedDays = useMemo(
    () =>
      dayRecords(data, weekDates(today, 28).filter((d) => d <= today)).filter((d) => d.kcal > 0)
        .length,
    [data, today]
  )

  const coaching = useMemo(
    () =>
      insights({
        days: dayRecords(data, weekDates(today, 28).filter((d) => d <= today)),
        targets: data.targets,
        weights: data.weights,
        startWeightKg: data.profile.startWeightKg,
        today,
        profile: data.profile,
        goalWeightKg: data.profile.goalWeightKg,
      }),
    [data, today]
  )
  const toGoal = latest === null ? null : round1(latest - data.profile.goalWeightKg)
  const lost = latest === null ? null : round1(data.profile.startWeightKg - latest)

  const addWeight = () => {
    const kg = Number.parseFloat(input)
    if (!Number.isFinite(kg) || kg <= 0) return
    update((d) => ({
      ...d,
      // One weigh-in per day, so a correction replaces rather than duplicates.
      weights: [
        ...d.weights.filter((w) => w.date !== today),
        { id: today, date: today, weightKg: kg, waistCm: null, hipCm: null } satisfies WeightLog,
      ],
    }))
    setInput('')
  }

  if (!ready) return <p className="py-20 text-center text-secondary text-faint">Loading…</p>

  return (
    <>
      <PageHeader title="Progress" subtitle="Weight & compliance" />

      <Card className="mb-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Now" value={latest === null ? '—' : `${latest}`} unit="kg" />
          <Stat
            label="Lost"
            value={lost === null ? '—' : `${lost > 0 ? lost : 0}`}
            unit="kg"
            tone="avocado"
          />
          <Stat
            label="To goal"
            value={toGoal === null ? '—' : `${toGoal > 0 ? toGoal : 0}`}
            unit="kg"
            tone="primary"
          />
        </div>

        {/* Starting weight drives "Lost" and the weight badges, so it needs to
            be reachable from the screen that shows those numbers. */}
        <Link
          href="/more/settings"
          className="tap mt-3 flex items-center justify-between rounded-xl bg-raised px-3 py-2 text-tertiary"
        >
          <span className="text-muted">
            Starting weight{' '}
            <strong className="text-ink">{data.profile.startWeightKg} kg</strong> · Goal{' '}
            <strong className="text-ink">{data.profile.goalWeightKg} kg</strong>
          </span>
          <span className="inline-flex items-center gap-0.5 font-semibold text-primary-ink">
            Edit
            <Icon name="chevron" size={14} strokeWidth={2.5} />
          </span>
        </Link>

        <div className="mt-4 flex gap-2">
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Today’s weight (kg)"
            aria-label="Today's weight in kg"
            className="min-w-0 flex-1 rounded-pill border border-line bg-surface px-4 py-2.5 text-body outline-none placeholder:text-faint focus:border-primary"
          />
          <button
            type="button"
            onClick={addWeight}
            className="tap shrink-0 rounded-pill bg-primary px-5 text-secondary font-bold text-on-primary"
          >
            Save
          </button>
        </div>
        <p className="mt-2 text-caption leading-snug text-faint">
          Weigh in once a week — morning, after the toilet, before breakfast. Weight swings
          1–3% day to day, so follow the average line, not a single reading.
        </p>
      </Card>

      <ProgressCharts today={today} />

      <TrendCard today={today} />

      {/* Silently rendering nothing left people assuming the feature was
          missing. Show the locked state and what opens it. */}
      {coaching.length === 0 && (
        <section className="mb-5">
          <h2 className="mb-1.5 px-4 text-tertiary font-semibold uppercase tracking-wide text-faint">
            What your log shows
          </h2>
          <div className="rounded-card bg-surface p-4 shadow-card">
            <p className="text-body font-semibold">Patterns need a few days</p>
            <p className="mt-1 text-tertiary leading-relaxed text-muted">
              Once {Math.max(0, 3 - loggedDays)} more {loggedDays === 2 ? 'day is' : 'days are'}{' '}
              logged, this fills with observations from your own diary — how weekends compare
              to weekdays, whether protein is holding, how fast you are actually losing.
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-pill bg-raised">
              <div
                className="h-full bg-primary transition-[width] duration-500"
                style={{ width: `${Math.min(100, (loggedDays / 3) * 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-caption text-faint">{loggedDays} of 3 days logged</p>
          </div>
        </section>
      )}

      {coaching.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-1.5 px-4 text-tertiary font-semibold uppercase tracking-wide text-faint">
            What your log shows
          </h2>
          <div className="stack gap-2">
            {coaching.map((i) => (
              <div
                key={i.id}
                className={`rounded-card border-l-[3px] bg-surface p-3.5 shadow-card ${
                  i.tone === 'good'
                    ? 'border-l-avocado'
                    : i.tone === 'watch'
                      ? 'border-l-amber'
                      : 'border-l-ocean'
                }`}
              >
                <p className="text-body font-semibold">{i.title}</p>
                <p className="mt-0.5 text-tertiary leading-relaxed text-muted">{i.detail}</p>
                {i.suggest && <PickRail need={i.suggest} />}
              </div>
            ))}
          </div>
        </section>
      )}

      <ListGroup header="This week">
        <ul>
          {dayRecords(data, weekOf(today)).map((d) => (
            <li
              key={d.date}
              className="flex items-center justify-between gap-2 px-4 py-2.5 [&+li]:border-t [&+li]:border-line"
            >
              <span className="text-secondary">
                {formatDay(d.date, {
                  weekday: 'short',
                  day: 'numeric',
                })}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-tertiary tabular-nums text-faint">
                  {d.kcal > 0 ? `${Math.round(d.kcal)} kcal` : '—'}
                </span>
                <StatusPill band={statusBand(d.kcal, data.targets.kcal)} />
              </span>
            </li>
          ))}
        </ul>
      </ListGroup>
    </>
  )
}

function Stat({
  label,
  value,
  unit,
  tone = 'ink',
}: {
  label: string
  value: string
  unit: string
  tone?: 'ink' | 'primary' | 'avocado'
}) {
  const colour = tone === 'primary' ? 'text-primary-ink' : tone === 'avocado' ? 'text-avocado' : ''
  return (
    <div>
      <p className={`text-2xl font-extrabold tabular-nums ${colour}`}>
        {value}
        <span className="ml-0.5 text-tertiary font-semibold text-faint">{unit}</span>
      </p>
      <p className="text-tertiary font-semibold">{label}</p>
    </div>
  )
}
