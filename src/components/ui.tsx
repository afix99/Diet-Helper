'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { STATUS_LABELS, type StatusBand } from '@/lib/nutrition'
import { useCountUp } from '@/hooks/useCountUp'
import { Emoji, type EmojiName } from './Emoji'
import { Icon } from './icons'

/** iOS keeps back navigation in the nav bar, not floating in the content. */
export function BackButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-0.5 text-body text-primary-ink active:opacity-60"
    >
      <Icon name="chevron" size={18} strokeWidth={2.5} className="-ml-1.5 rotate-180" />
      {label}
    </Link>
  )
}

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
  back,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  back?: { href: string; label: string }
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
        className={`glass fixed inset-x-0 top-0 z-30 flex h-[calc(env(safe-area-inset-top)+48px)] items-end rounded-none border-x-0 border-t-0 px-4 pb-2.5 transition-opacity duration-200 ${
          collapsed ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        {/* Back stays reachable once the large title has scrolled away. */}
        <span className="flex-1 truncate">{back && <BackButton {...back} />}</span>
        <span className="text-title">{title}</span>
        <span className="flex-1" aria-hidden />
      </div>

      {back && (
        <div className="mb-1 pt-1">
          <BackButton {...back} />
        </div>
      )}

      <header className="mb-4 flex items-start justify-between gap-3 pt-1">
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
  style,
}: {
  children: ReactNode
  className?: string
  /** Used for per-item stagger delays on animated lists. */
  style?: React.CSSProperties
}) {
  return (
    <section style={style} className={`card p-4 ${className}`}>
      {children}
    </section>
  )
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
      className={`grid h-7 w-7 shrink-0 place-items-center rounded-[8px] text-on-primary ${TILE_TONES[tone]}`}
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
      <Icon name={label.icon} size={12} strokeWidth={2.75} />
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
  /**
   * Breaks a raised allowance back into the target you set plus what exercise
   * added, so a bigger ring never arrives unexplained.
   *
   * Rendered *below* the ring rather than appended to the ratio: inside the
   * 176px box it wrapped onto a second line and ran straight through the arc.
   */
  note,
}: {
  consumed: number
  target: number
  band: StatusBand
  note?: string
}) {
  // The headline figure counts rather than snapping, so a change is legible.
  const shown = useCountUp(consumed)

  /*
   * A pulse when the total moves, keyed so React remounts the node and replays
   * the animation. Small on purpose: it sits behind the headline figure, and a
   * big bounce there would fight the count-up rather than support it.
   */
  const [pulse, setPulse] = useState(0)
  const lastTarget = useRef(consumed)
  useEffect(() => {
    if (consumed === lastTarget.current) return
    lastTarget.current = consumed
    setPulse((n) => n + 1)
  }, [consumed])
  const remaining = Math.round(target - shown)
  const over = remaining < 0

  /*
   * Two laps, not one clamped arc. Clamping at 100% drew 990/800 and 3000/800
   * identically, which is the same lie the macro bars used to tell before they
   * grew an overflow segment. The first lap fills the target; the second draws
   * how far past it you are, as a fraction of the same target.
   */
  const lap1 = target > 0 ? Math.min(1, shown / target) : 0
  const lap2 = target > 0 ? Math.min(1, Math.max(0, shown - target) / target) : 0

  const size = 176
  const stroke = 14
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const colour =
    band === 'over' ? 'rgb(var(--clay))' : band === 'close' ? 'rgb(var(--amber))' : 'rgb(var(--primary))'

  const arc = (pct: number, opacity: number) => (
    <circle
      cx={size / 2}
      cy={size / 2}
      r={r}
      fill="none"
      stroke={colour}
      strokeOpacity={opacity}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeDasharray={circumference}
      strokeDashoffset={circumference * (1 - pct)}
      style={{ transition: 'stroke-dashoffset 420ms cubic-bezier(0.34,1.2,0.64,1)' }}
    />
  )

  const ring = (
    <div
      key={pulse}
      className={`relative mx-auto ${pulse > 0 ? 'animate-ring-pulse' : ''}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        role="img"
        aria-label={`${Math.abs(remaining)} kcal ${over ? 'over target' : 'left'}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgb(var(--raised))"
          strokeWidth={stroke}
        />
        {arc(lap1, over ? 0.35 : 1)}
        {lap2 > 0 && arc(lap2, 1)}
      </svg>

      {/*
        The numeral sits on the ring's axis, not the centroid of three lines.
        Centring the stack as a group put it 18.5px high — the group balanced,
        the number did not, and the number is what the eye locks onto.
      */}
      <div className="absolute inset-0 grid place-items-center">
        <span
          data-ring-value
          className="text-4xl font-extrabold tabular-nums leading-none"
        >
          {Math.abs(remaining)}
        </span>
      </div>
      {/* 22px = half the 36px numeral, plus its 4px gap. Derived, not eyeballed. */}
      <div className="absolute inset-x-0 top-1/2 mt-[22px] flex flex-col items-center">
        <span className="text-tertiary font-semibold text-muted">
          {over ? 'kcal over' : 'kcal left'}
        </span>
        <span className="mt-0.5 text-caption text-faint tabular-nums">
          {Math.round(shown).toLocaleString('en-GB')} / {target.toLocaleString('en-GB')}
        </span>
      </div>
    </div>
  )

  if (!note) return ring

  return (
    <div>
      {ring}
      <p className="mt-2 text-center text-caption text-faint tabular-nums">{note}</p>
    </div>
  )
}

export function MacroBar({
  label,
  value,
  target,
  unit = 'g',
  tone,
  onExplain,
}: {
  label: string
  value: number
  target: number
  unit?: string
  tone: 'primary' | 'avocado' | 'amber' | 'ocean'
  /** Given, and only when over target, the whole row becomes a button. */
  onExplain?: () => void
}) {
  const over = target > 0 && value > target
  /*
   * Under target the bar means "how much of the target is used". Over it, the
   * track is rescaled to what was actually eaten, so the target becomes a share
   * of the bar rather than the whole of it. Clamping at 100% was the old
   * behaviour and it made 180g and 400g look identical.
   */
  const targetShare = target > 0 ? Math.min(1, value === 0 ? 0 : over ? target / value : value / target) : 0
  const fills = {
    primary: 'bg-primary',
    avocado: 'bg-avocado',
    amber: 'bg-amber',
    ocean: 'bg-ocean',
  }
  const overflows = {
    primary: 'bg-primary/40',
    avocado: 'bg-avocado/40',
    amber: 'bg-amber/40',
    ocean: 'bg-ocean/40',
  }

  const inner = (
    <>
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
      <div className="flex h-2 overflow-hidden rounded-pill bg-raised">
        <div
          className={`h-full ${fills[tone]} transition-[width] duration-700 ease-out`}
          style={{ width: `${targetShare * 100}%` }}
        />
        {over && (
          // The border draws a hairline at the target, so the eye can see where
          // the line was without needing the numbers.
          <div
            className={`h-full border-l-2 border-surface ${overflows[tone]} transition-[width] duration-700 ease-out`}
            style={{ width: `${(1 - targetShare) * 100}%` }}
          />
        )}
      </div>
      {over && onExplain && (
        <span className="mt-1 flex items-center gap-1 text-caption font-semibold text-primary-ink">
          +{Math.round(value - target)}
          {unit} over
          <span className="font-normal text-faint">&middot; where does it go?</span>
          <Icon name="chevron" size={12} strokeWidth={2.5} className="text-faint" />
        </span>
      )}
    </>
  )

  // The row is already taller than the 44px minimum, so making the whole thing
  // the target costs no layout and beats a tiny link under each bar.
  if (over && onExplain) {
    return (
      <button
        type="button"
        onClick={onExplain}
        aria-label={`${label} is over target. What happens to it?`}
        className="tap w-full text-left transition active:scale-[0.99]"
      >
        {inner}
      </button>
    )
  }
  return <div>{inner}</div>
}

export function EmptyState({
  art,
  title,
  hint,
}: {
  art: EmojiName
  title: string
  hint?: string
}) {
  return (
    <div className="py-10 text-center">
      <Emoji name={art} size={44} className="opacity-90" />
      <p className="mt-2 font-semibold">{title}</p>
      {hint && <p className="text-secondary text-faint">{hint}</p>}
    </div>
  )
}

/**
 * iOS 26 segmented control. The shape is a capsule — Apple made that the system
 * style and stopped allowing the old rounded rectangle — with a thumb that
 * slides between segments rather than each option toggling independently.
 *
 * Generic over the option key so each screen's own tab union stays type-safe.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  label: string
}) {
  const index = Math.max(0, options.findIndex((o) => o.value === value))

  return (
    <div
      role="tablist"
      aria-label={label}
      className="relative mb-5 flex rounded-pill bg-raised p-1"
    >
      {/* One sliding thumb, positioned by index, rather than per-option styling. */}
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 rounded-pill bg-surface shadow-card transition-transform duration-200 ease-out"
        style={{
          width: `calc((100% - 0.5rem) / ${options.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {options.map((o) => {
        const selected = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(o.value)}
            className={`relative z-10 min-h-[36px] flex-1 rounded-pill px-2 text-tertiary font-semibold transition-colors ${
              selected ? 'text-ink' : 'text-muted'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Bottom sheet shell. iOS 26 floats a sheet at its lowest detent with a gap and
 * fully rounded corners, and marks it with a grabber so it reads as draggable.
 * We don't implement drag detents, but the grabber and the floating geometry are
 * what make it recognisable.
 */
export function Sheet({
  children,
  onClose,
  className = '',
  labelledBy,
  leaving = false,
}: {
  children: ReactNode
  onClose: () => void
  className?: string
  labelledBy?: string
  /** Set by the parent's usePresence while the exit animation plays. */
  leaving?: boolean
}) {
  // Escape should dismiss, as it does for a system sheet on a hardware keyboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={`absolute inset-0 bg-ink/40 backdrop-blur-[2px] ${
          leaving ? 'animate-scrim-out' : 'animate-scrim-in'
        }`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        // Transform animations run on the compositor, so the sheet keeps
        // gliding even while the food list below it is re-rendering.
        className={`relative flex max-h-[88dvh] flex-col rounded-t-sheet border-t border-line bg-bg shadow-lift ${
          leaving ? 'animate-sheet-out' : 'animate-sheet-in'
        } ${className}`}
      >
        <span
          aria-hidden
          data-grabber
          className="mx-auto mt-2 h-[5px] w-9 shrink-0 rounded-pill bg-faint/40"
        />
        {children}
      </div>
    </div>
  )
}
