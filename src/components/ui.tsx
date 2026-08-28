'use client'

import type { ReactNode } from 'react'
import { STATUS_LABELS, type StatusBand } from '@/lib/nutrition'

export function PageHeader({
  ms,
  en,
  action,
}: {
  ms: string
  en: string
  action?: ReactNode
}) {
  return (
    <header className="mb-5 flex items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{ms}</h1>
        <p className="text-sm text-faint">{en}</p>
      </div>
      {action}
    </header>
  )
}

export function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <section className={`card p-4 ${className}`}>{children}</section>
}

const BAND_STYLES: Record<StatusBand, string> = {
  empty: 'bg-raised text-faint',
  under: 'bg-ocean/15 text-ocean',
  on_target: 'bg-avocado/15 text-avocado',
  close: 'bg-amber/15 text-amber',
  over: 'bg-clay/15 text-clay',
}

export function StatusPill({ band }: { band: StatusBand }) {
  const label = STATUS_LABELS[band]
  return (
    <span className={`pill ${BAND_STYLES[band]}`}>
      <span aria-hidden>{label.mark}</span>
      {label.ms}
      <span className="sr-only"> — {label.en}</span>
    </span>
  )
}

/**
 * The one number that matters, as a ring. Research on calorie-budget UIs is
 * consistent that a single headline figure beats a macro table for adherence.
 */
export function BudgetRing({
  consumed,
  target,
  band,
}: {
  consumed: number
  target: number
  band: StatusBand
}) {
  const remaining = Math.round(target - consumed)
  const pct = target > 0 ? Math.min(1, consumed / target) : 0
  const size = 176
  const stroke = 14
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const colour =
    band === 'over' ? 'rgb(var(--clay))' : band === 'close' ? 'rgb(var(--amber))' : 'rgb(var(--salmon))'

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`${remaining} kcal berbaki`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgb(var(--raised))"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={colour}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 420ms cubic-bezier(0.34,1.2,0.64,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-extrabold tabular-nums leading-none">
          {Math.abs(remaining)}
        </span>
        <span className="mt-1 text-xs font-semibold text-muted">
          {remaining >= 0 ? 'kcal lagi' : 'kcal lebih'}
        </span>
        <span className="mt-0.5 text-[11px] text-faint tabular-nums">
          {Math.round(consumed)} / {target}
        </span>
      </div>
    </div>
  )
}

export function MacroBar({
  label,
  en,
  value,
  target,
  unit = 'g',
  tone,
}: {
  label: string
  en: string
  value: number
  target: number
  unit?: string
  tone: 'salmon' | 'avocado' | 'amber' | 'ocean'
}) {
  const pct = target > 0 ? Math.min(1, value / target) : 0
  const fills = {
    salmon: 'bg-salmon',
    avocado: 'bg-avocado',
    amber: 'bg-amber',
    ocean: 'bg-ocean',
  }
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="font-semibold">
          {label} <span className="font-normal text-faint">{en}</span>
        </span>
        <span className="tabular-nums text-muted">
          {Math.round(value)}
          <span className="text-faint">
            /{target}
            {unit}
          </span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-pill bg-raised">
        <div
          className={`h-full rounded-pill ${fills[tone]} transition-[width] duration-500`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  )
}

export function EmptyState({ emoji, ms, en }: { emoji: string; ms: string; en: string }) {
  return (
    <div className="py-10 text-center">
      <div aria-hidden className="text-4xl">
        {emoji}
      </div>
      <p className="mt-2 font-semibold">{ms}</p>
      <p className="text-sm text-faint">{en}</p>
    </div>
  )
}
