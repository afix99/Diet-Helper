'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { STATUS_LABELS, type StatusBand } from '@/lib/nutrition'
import { Icon } from './icons'

/**
 * The iOS large-title pattern: a 34pt title in the scroll flow that hands off
 * to a compact sticky bar once it scrolls away.
 *
 * The handoff is driven by an IntersectionObserver on a sentinel rather than a
 * scroll listener — it fires off the main thread and costs nothing per frame.
 */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  const sentinel = useRef<HTMLDivElement>(null)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const node = sentinel.current
    if (!node || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      ([entry]) => setCollapsed(!entry.isIntersecting),
      { threshold: 0 }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <div
        aria-hidden
        className={`glass pointer-events-none fixed inset-x-0 top-0 z-30 flex h-[calc(env(safe-area-inset-top)+48px)] items-end justify-center rounded-none border-x-0 border-t-0 pb-2.5 transition-opacity duration-200 ${
          collapsed ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <span className="text-title">{title}</span>
      </div>

      <header className="mb-4 flex items-start justify-between gap-3 pt-2">
        <div className="min-w-0">
          <h1 className="text-large-title">{title}</h1>
          {subtitle && <p className="mt-0.5 text-secondary text-faint">{subtitle}</p>}
        </div>
        {action}
      </header>
      <div ref={sentinel} aria-hidden className="h-px" />
    </>
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

/**
 * iOS grouped-inset list. The optional header is the 13pt uppercase caption
 * Apple puts above a settings group.
 */
export function ListGroup({
  header,
  footer,
  children,
  className = '',
}: {
  header?: string
  footer?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`mb-5 ${className}`}>
      {header && (
        <h2 className="mb-1.5 px-4 text-tertiary font-semibold uppercase tracking-wide text-faint">
          {header}
        </h2>
      )}
      <div className="overflow-hidden rounded-card bg-surface shadow-card">{children}</div>
      {footer && <p className="mt-1.5 px-4 text-tertiary text-faint">{footer}</p>}
    </section>
  )
}

/**
 * One row of a grouped list. Dividers are inset from the left so they start
 * under the label rather than cutting the card in half, as iOS does.
 */
export function ListRow({
  icon,
  label,
  secondary,
  value,
  chevron = false,
  onClick,
  href,
  destructive = false,
  children,
}: {
  icon?: ReactNode
  label: ReactNode
  secondary?: ReactNode
  value?: ReactNode
  chevron?: boolean
  onClick?: () => void
  href?: string
  destructive?: boolean
  children?: ReactNode
}) {
  const inner = (
    <>
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className={`block text-body ${destructive ? 'text-clay' : ''}`}>{label}</span>
        {secondary && <span className="mt-0.5 block text-tertiary text-faint">{secondary}</span>}
      </span>
      {value && <span className="shrink-0 text-secondary text-muted">{value}</span>}
      {chevron && (
        <Icon name="chevron" size={16} strokeWidth={2.25} className="shrink-0 text-faint" />
      )}
    </>
  )

  const cls =
    'tap flex w-full items-center gap-3 px-4 py-2.5 text-left [&+&]:border-t [&+&]:border-line'

  if (href) {
    return (
      <a href={href} className={cls}>
        {inner}
      </a>
    )
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls}>
        {inner}
      </button>
    )
  }
  return <div className={`${cls} min-h-[44px]`}>{children ?? inner}</div>
}

/**
 * Tinted rounded-square icon tile, the way iOS Settings marks each row.
 * Tones are a fixed map, not interpolated — Tailwind can only see class names
 * that appear literally in the source.
 */
const TILE_TONES = {
  primary: 'bg-primary',
  avocado: 'bg-avocado',
  amber: 'bg-amber',
  ocean: 'bg-ocean',
  clay: 'bg-clay',
} as const

export type TileTone = keyof typeof TILE_TONES

export function IconTile({
  children,
  tone = 'primary',
}: {
  children: ReactNode
  tone?: TileTone
}) {
  return (
    <span
      aria-hidden
      className={`grid h-7 w-7 shrink-0 place-items-center rounded-[8px] text-white ${TILE_TONES[tone]}`}
    >
      {children}
    </span>
  )
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
      {label.label}
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
    band === 'over' ? 'rgb(var(--clay))' : band === 'close' ? 'rgb(var(--amber))' : 'rgb(var(--primary))'

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`${remaining} kcal remaining`}>
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
        <span className="mt-1 text-tertiary font-semibold text-muted">
          {remaining >= 0 ? 'kcal left' : 'kcal over'}
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
  value,
  target,
  unit = 'g',
  tone,
}: {
  label: string
  value: number
  target: number
  unit?: string
  tone: 'primary' | 'avocado' | 'amber' | 'ocean'
}) {
  const pct = target > 0 ? Math.min(1, value / target) : 0
  const fills = {
    primary: 'bg-primary',
    avocado: 'bg-avocado',
    amber: 'bg-amber',
    ocean: 'bg-ocean',
  }
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-tertiary">
        <span className="font-semibold">{label}</span>
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

export function EmptyState({
  emoji,
  title,
  hint,
}: {
  emoji: string
  title: string
  hint?: string
}) {
  return (
    <div className="py-10 text-center">
      <div aria-hidden className="text-4xl">
        {emoji}
      </div>
      <p className="mt-2 font-semibold">{title}</p>
      {hint && <p className="text-secondary text-faint">{hint}</p>}
    </div>
  )
}
