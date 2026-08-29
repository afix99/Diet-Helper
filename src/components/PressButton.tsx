'use client'

import { useCallback, useRef, useState, type ReactNode } from 'react'
import { haptic } from '@/lib/haptics'
import { Icon } from './icons'

type Variant = 'primary' | 'quiet' | 'outline' | 'destructive'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary shadow-card',
  quiet: 'bg-raised text-muted',
  outline: 'border border-line text-muted',
  destructive: 'bg-clay text-on-primary',
}

interface Ripple {
  id: number
  x: number
  y: number
  size: number
}

/**
 * The app's one button.
 *
 * Three bits of feedback, because a tap on glass gives none of its own: the
 * surface dips, a ripple grows from where the finger actually landed, and the
 * phone ticks. Together they make a press feel acknowledged rather than
 * hopeful.
 *
 * `loading` and `success` are handled here so no screen has to invent its own
 * pending state, and both keep the button's width so nothing jumps.
 */
export function PressButton({
  children,
  onClick,
  variant = 'primary',
  full = false,
  loading = false,
  success = false,
  disabled = false,
  className = '',
  hapticWeight = 'light',
  type = 'button',
  'aria-label': ariaLabel,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: Variant
  full?: boolean
  loading?: boolean
  success?: boolean
  disabled?: boolean
  className?: string
  hapticWeight?: 'light' | 'medium' | 'success'
  type?: 'button' | 'submit'
  'aria-label'?: string
}) {
  const [ripples, setRipples] = useState<Ripple[]>([])
  const nextId = useRef(0)

  const spawn = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    // Cover the furthest corner from the touch point, so it fills the button.
    const size = Math.max(rect.width, rect.height) * 2
    const id = nextId.current++
    setRipples((r) => [
      ...r,
      { id, x: e.clientX - rect.left - size / 2, y: e.clientY - rect.top - size / 2, size },
    ])
    window.setTimeout(() => setRipples((r) => r.filter((x) => x.id !== id)), 560)
  }, [])

  const busy = loading || disabled

  return (
    <button
      type={type}
      aria-label={ariaLabel}
      aria-busy={loading || undefined}
      disabled={busy}
      onPointerDown={busy ? undefined : spawn}
      onClick={
        busy
          ? undefined
          : () => {
              haptic(success ? 'success' : hapticWeight)
              onClick?.()
            }
      }
      className={`tap relative isolate overflow-hidden rounded-pill px-5 py-3 text-secondary font-bold transition
        active:scale-[0.97] disabled:opacity-50
        ${VARIANTS[variant]} ${full ? 'w-full' : ''} ${className}`}
    >
      {ripples.map((r) => (
        <span
          key={r.id}
          aria-hidden
          className="pointer-events-none absolute -z-10 animate-ripple rounded-full bg-current/25"
          style={{ left: r.x, top: r.y, width: r.size, height: r.size }}
        />
      ))}

      <span
        className={`flex items-center justify-center gap-2 transition-opacity ${
          loading ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {success && <Icon name="check" size={16} strokeWidth={3} className="animate-pop-in" />}
        {children}
      </span>

      {loading && (
        <span className="absolute inset-0 grid place-items-center">
          <span
            aria-hidden
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        </span>
      )}
    </button>
  )
}
