'use client'

import { useId, useMemo, useRef, useState } from 'react'
import { formatDay } from '@/lib/dates'

/**
 * One interactive chart, shared by every graph on Progress.
 *
 * The charts it replaces were static pictures: no gridlines, two y labels, no
 * dates on the weight chart at all, and no way to ask what any point actually
 * was. You could see a line going down and learn nothing more precise than
 * "down".
 *
 * Three things fix that, and they are the whole component:
 *
 * - **Gridlines and real labels on both axes**, so a value can be read off
 *   without touching anything.
 * - **Drag to inspect.** Pointer events rather than hover, because this is a
 *   phone: hover does not exist and a tooltip that needs a mouse is a tooltip
 *   nobody here will ever see. Touching anywhere snaps to the nearest day and
 *   reports every series at once, which is the comparison the page is for.
 * - **Gaps stay gaps.** A day with nothing logged breaks the line instead of
 *   dropping it to zero. Drawing a crash to the floor for a day someone forgot
 *   to log would read as a fast that never happened.
 *
 * Inline SVG, no charting library: three charts of a few dozen points each do
 * not justify shipping one to a phone, and this is the fourth hand-rolled
 * chart in the app rather than the first.
 */

export interface ChartSeries {
  id: string
  label: string
  /** A CSS colour, usually `rgb(var(--primary))`. */
  colour: string
  /** Null breaks the line. */
  values: (number | null)[]
  kind?: 'line' | 'area' | 'bar'
  /** Which axis it belongs to. Defaults to the left. */
  axis?: 'left' | 'right'
  /** How the readout should render a value. */
  format?: (v: number) => string
  dashed?: boolean
}

export interface ChartRule {
  value: number
  label: string
  colour: string
  axis?: 'left' | 'right'
}

const W = 320
const H = 168
const PAD = { top: 12, right: 34, bottom: 22, left: 34 }
const INNER_W = W - PAD.left - PAD.right
const INNER_H = H - PAD.top - PAD.bottom

/** Nice round steps, so a gridline lands on 1,500 rather than on 1,483.6. */
function ticks(min: number, max: number, count = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return [min]
  const raw = (max - min) / count
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag * 10
  const out: number[] = []
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(v)
  return out.length ? out : [min]
}

const short = (n: number) => (Math.abs(n) >= 1000 ? `${Math.round(n / 100) / 10}k` : String(Math.round(n)))

export function Chart({
  dates,
  series,
  rules = [],
  leftUnit,
  rightUnit,
  ariaLabel,
}: {
  dates: string[]
  series: ChartSeries[]
  rules?: ChartRule[]
  leftUnit?: string
  rightUnit?: string
  ariaLabel: string
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const svg = useRef<SVGSVGElement>(null)
  const [at, setAt] = useState<number | null>(null)

  const scales = useMemo(() => {
    const build = (axis: 'left' | 'right') => {
      const vals = series
        .filter((s) => (s.axis ?? 'left') === axis)
        .flatMap((s) => s.values)
        .filter((v): v is number => v !== null)
      const ruleVals = rules.filter((r) => (r.axis ?? 'left') === axis).map((r) => r.value)
      const all = [...vals, ...ruleVals]
      if (all.length === 0) return null
      let lo = Math.min(...all)
      let hi = Math.max(...all)
      if (hi === lo) {
        // A single reading still deserves a sensible band around it.
        lo -= Math.max(1, Math.abs(lo) * 0.05)
        hi += Math.max(1, Math.abs(hi) * 0.05)
      } else {
        const pad = (hi - lo) * 0.12
        lo -= pad
        hi += pad
      }
      // Bars read as proportions, so their axis has to start at zero or a
      // 1,400 kcal day looks twice a 1,300 one.
      if (series.some((s) => s.kind === 'bar' && (s.axis ?? 'left') === axis)) lo = 0
      return { lo, hi }
    }
    return { left: build('left'), right: build('right') }
  }, [series, rules])

  const n = Math.max(1, dates.length)
  const x = (i: number) => PAD.left + (dates.length < 2 ? INNER_W / 2 : (i / (n - 1)) * INNER_W)
  const yFor = (axis: 'left' | 'right') => (v: number) => {
    const s = scales[axis]
    if (!s) return PAD.top + INNER_H / 2
    return PAD.top + INNER_H * (1 - (v - s.lo) / (s.hi - s.lo || 1))
  }

  const path = (s: ChartSeries) => {
    const y = yFor(s.axis ?? 'left')
    let d = ''
    let open = false
    s.values.forEach((v, i) => {
      if (v === null) {
        open = false
        return
      }
      d += `${open ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`
      open = true
    })
    return d
  }

  /** Snap a pointer position to the nearest day. */
  const scrub = (clientX: number) => {
    const box = svg.current?.getBoundingClientRect()
    if (!box || dates.length === 0) return
    const rel = ((clientX - box.left) / box.width) * W
    const t = (rel - PAD.left) / (INNER_W || 1)
    setAt(Math.max(0, Math.min(dates.length - 1, Math.round(t * (n - 1)))))
  }

  const leftTicks = scales.left ? ticks(scales.left.lo, scales.left.hi) : []
  const rightTicks = scales.right ? ticks(scales.right.lo, scales.right.hi, 3) : []
  const barSeries = series.filter((s) => s.kind === 'bar')
  const barW = Math.max(2, Math.min(14, (INNER_W / n) * 0.6))

  const readAt = at ?? dates.length - 1
  const showing = at !== null

  return (
    <div>
      <svg
        ref={svg}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-pan-y select-none"
        role="img"
        aria-label={ariaLabel}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          scrub(e.clientX)
        }}
        onPointerMove={(e) => {
          if (e.buttons > 0 || e.pointerType === 'touch') {
            if (at !== null) scrub(e.clientX)
          }
        }}
        onPointerUp={() => setAt(null)}
        onPointerCancel={() => setAt(null)}
        onPointerLeave={() => setAt(null)}
      >
        {/* Gridlines first, so every mark sits over them. */}
        {leftTicks.map((t) => (
          <g key={`g${t}`}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={yFor('left')(t)}
              y2={yFor('left')(t)}
              stroke="rgb(var(--line))"
              strokeWidth="0.6"
            />
            <text
              x={PAD.left - 4}
              y={yFor('left')(t) + 2.5}
              fontSize="7.5"
              textAnchor="end"
              fill="rgb(var(--faint))"
            >
              {short(t)}
            </text>
          </g>
        ))}
        {rightTicks.map((t) => (
          <text
            key={`r${t}`}
            x={W - PAD.right + 4}
            y={yFor('right')(t) + 2.5}
            fontSize="7.5"
            fill="rgb(var(--faint))"
          >
            {short(t)}
          </text>
        ))}
        {leftUnit && (
          <text x={PAD.left - 4} y={PAD.top - 4} fontSize="7" textAnchor="end" fill="rgb(var(--faint))">
            {leftUnit}
          </text>
        )}
        {rightUnit && (
          <text x={W - PAD.right + 4} y={PAD.top - 4} fontSize="7" fill="rgb(var(--faint))">
            {rightUnit}
          </text>
        )}

        {rules.map((r) => (
          <g key={r.label}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={yFor(r.axis ?? 'left')(r.value)}
              y2={yFor(r.axis ?? 'left')(r.value)}
              stroke={r.colour}
              strokeWidth="1.2"
              strokeDasharray="4 4"
            />
            <text
              x={PAD.left + 2}
              y={yFor(r.axis ?? 'left')(r.value) - 3}
              fontSize="7.5"
              fill={r.colour}
            >
              {r.label}
            </text>
          </g>
        ))}

        {barSeries.map((s) =>
          s.values.map((v, i) =>
            v === null ? null : (
              <rect
                key={`${s.id}${i}`}
                x={x(i) - barW / 2}
                y={yFor(s.axis ?? 'left')(v)}
                width={barW}
                height={Math.max(0, PAD.top + INNER_H - yFor(s.axis ?? 'left')(v))}
                rx="1.5"
                fill={s.colour}
              />
            )
          )
        )}

        {series
          .filter((s) => s.kind !== 'bar')
          .map((s) => (
            <path
              key={s.id}
              d={path(s)}
              fill="none"
              stroke={s.colour}
              strokeWidth={s.dashed ? 1.5 : 2.2}
              strokeDasharray={s.dashed ? '3 3' : undefined}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

        {/* The scrub line and its dots, drawn last so nothing hides them. */}
        {showing && (
          <g pointerEvents="none">
            <line
              x1={x(readAt)}
              x2={x(readAt)}
              y1={PAD.top}
              y2={PAD.top + INNER_H}
              stroke="rgb(var(--ink))"
              strokeWidth="1"
              strokeOpacity="0.35"
            />
            {series.map((s) => {
              const v = s.values[readAt]
              return v === null || v === undefined ? null : (
                <circle
                  key={`d${s.id}`}
                  cx={x(readAt)}
                  cy={yFor(s.axis ?? 'left')(v)}
                  r="3.2"
                  fill={s.colour}
                  stroke="rgb(var(--surface))"
                  strokeWidth="1.4"
                />
              )
            })}
          </g>
        )}

        {dates.map((d, i) =>
          i === 0 || i === dates.length - 1 || (dates.length > 6 && i === Math.floor((dates.length - 1) / 2)) ? (
            <text
              key={`x${uid}${d}`}
              x={x(i)}
              y={H - 6}
              fontSize="7.5"
              textAnchor={i === 0 ? 'start' : i === dates.length - 1 ? 'end' : 'middle'}
              fill="rgb(var(--faint))"
            >
              {formatDay(d, { day: 'numeric', month: 'short' })}
            </text>
          ) : null
        )}
      </svg>

      {/*
        The readout. Fixed height whether or not a finger is down, because a
        panel that appears on touch would shove the chart up the screen at the
        exact moment you are trying to point at it.
      */}
      <div className="mt-1 min-h-[34px]">
        {dates.length > 0 && (
          <p className="text-caption text-faint">
            <span className="font-semibold text-muted">
              {formatDay(dates[readAt], { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
            {series.map((s) => {
              const v = s.values[readAt]
              return (
                <span key={`t${s.id}`} className="ml-2 whitespace-nowrap">
                  <span
                    className="mr-1 inline-block h-2 w-2 rounded-[2px] align-middle"
                    style={{ background: s.colour }}
                  />
                  {s.label}{' '}
                  <b className="font-semibold tabular-nums text-ink">
                    {v === null || v === undefined ? '—' : (s.format ?? short)(v)}
                  </b>
                </span>
              )
            })}
          </p>
        )}
        <p className="mt-0.5 text-caption text-faint">
          {showing ? 'Release to go back to the latest day' : 'Touch and drag the chart to read any day'}
        </p>
      </div>
    </div>
  )
}
