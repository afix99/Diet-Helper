/**
 * Line icons in the SF Symbols idiom: 24px grid, stroked rather than filled,
 * round caps and joins, drawn from `currentColor` so a tab tints itself just
 * by setting a text colour.
 *
 * Original geometry — the shapes follow the conventions of the style, not
 * Apple's artwork, which isn't ours to ship.
 */

import type { MealSlot } from '@/lib/types'

export type IconName =
  | 'today'
  | 'calendar'
  | 'search'
  | 'chart'
  | 'ellipsis'
  | 'book'
  | 'cart'
  | 'pill'
  | 'medal'
  | 'gear'
  | 'chevron'
  | 'plus'
  | 'close'
  | 'check'
  | 'pencil'
  | 'lock'
  | 'arrowUp'
  | 'arrowDown'
  | 'tilde'
  | 'dash'
  | 'activity'
  | 'droplet'
  | 'sunrise'
  | 'sun'
  | 'moon'
  | 'apple'
  | 'teacup'
  | 'glass'
  | 'star'
  | 'cat'
  | 'house'

const PATHS: Record<IconName, React.ReactNode> = {
  // A bowl with steam — the app's own mark, matching the launcher icon.
  today: (
    <>
      <path d="M3.5 11h17" />
      <path d="M4.5 11a7.5 7.5 0 0 0 15 0" />
      <path d="M9 7.5V4M12 7.5V3M15 7.5V4" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.25" y="5" width="17.5" height="16" rx="4" />
      <path d="M3.25 10h17.5M8 3v4M16 3v4" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.75" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  chart: (
    <>
      <path d="M3.5 20.5h17" />
      <path d="m4.5 15.5 4.75-5 3.5 3.25 6.75-7" />
      <path d="M15.75 6.5h3.75v3.75" />
    </>
  ),
  ellipsis: (
    <>
      <circle cx="5.5" cy="12" r="1.35" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.35" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="12" r="1.35" fill="currentColor" stroke="none" />
    </>
  ),
  book: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
      <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H19v3H6.5A2.5 2.5 0 0 1 4 20.5z" />
      <path d="M8.5 7.5h6" />
    </>
  ),
  cart: (
    <>
      <path d="M2.75 3.5h2.1l2.4 11.2h10.1" />
      <path d="M6.4 6.75h14.35l-1.6 6.6H7.65" />
      <circle cx="9" cy="19.25" r="1.5" />
      <circle cx="17" cy="19.25" r="1.5" />
    </>
  ),
  pill: (
    <>
      <rect x="2.6" y="8.4" width="18.8" height="7.2" rx="3.6" transform="rotate(-45 12 12)" />
      <path d="M9.4 6.9 17.1 14.6" />
    </>
  ),
  medal: (
    <>
      <circle cx="12" cy="14.5" r="5.5" />
      <path d="M8.5 9.4 6 2.5h12l-2.5 6.9" />
      <path d="m12 12.2 1 2.05 2.25.3-1.65 1.6.4 2.25L12 17.35l-2 1.05.4-2.25-1.65-1.6 2.25-.3z" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M12 2.6a1.4 1.4 0 0 1 1.4 1.4v.7a1.4 1.4 0 0 0 2 1.2l.5-.3a1.4 1.4 0 0 1 1.9.5l.6 1a1.4 1.4 0 0 1-.5 1.9l-.6.3a1.4 1.4 0 0 0 0 2.4l.6.3a1.4 1.4 0 0 1 .5 1.9l-.6 1a1.4 1.4 0 0 1-1.9.5l-.5-.3a1.4 1.4 0 0 0-2 1.2v.7a1.4 1.4 0 0 1-1.4 1.4h-1.2a1.4 1.4 0 0 1-1.4-1.4v-.7a1.4 1.4 0 0 0-2-1.2l-.5.3a1.4 1.4 0 0 1-1.9-.5l-.6-1a1.4 1.4 0 0 1 .5-1.9l.6-.3a1.4 1.4 0 0 0 0-2.4l-.6-.3a1.4 1.4 0 0 1-.5-1.9l.6-1a1.4 1.4 0 0 1 1.9-.5l.5.3a1.4 1.4 0 0 0 2-1.2V4a1.4 1.4 0 0 1 1.4-1.4z" />
    </>
  ),
  chevron: <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />,
  plus: <path d="M12 5.25v13.5M5.25 12h13.5" />,
  close: <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" />,
  check: <path d="m4.75 12.5 5 5 9.5-11" />,
  pencil: (
    <>
      <path d="M4 20.5h4.2L20 8.7a2.4 2.4 0 0 0-3.4-3.4L4.8 17.1z" />
      <path d="m15.2 6.7 3.4 3.4" />
    </>
  ),
  lock: (
    <>
      <rect x="4.75" y="10.5" width="14.5" height="10" rx="3" />
      <path d="M8.25 10.5V7.75a3.75 3.75 0 0 1 7.5 0v2.75" />
    </>
  ),
  arrowUp: <path d="M12 19V5.5M6 11.5 12 5.5l6 6" />,
  arrowDown: <path d="M12 5v13.5M6 12.5l6 6 6-6" />,
  tilde: <path d="M4 13c2.4-4 4.6-4 7 0s4.6 4 7 0" />,
  /*
   * A dumbbell. The first attempt drew all four plates as bare vertical
   * strokes, which at 17px collapsed into a row of tick marks — legible at 24
   * and meaningless at the size it is actually used. Solid outer plates give it
   * a silhouette that survives the shrink.
   */
  activity: (
    <>
      <rect x="2.6" y="9.4" width="4" height="5.2" rx="1.5" />
      <rect x="17.4" y="9.4" width="4" height="5.2" rx="1.5" />
      <path d="M6.6 12h10.8" />
      <path d="M9.1 9.9v4.2M14.9 9.9v4.2" />
    </>
  ),
  droplet: <path d="M12 3.4c3.3 3.7 5.3 6.4 5.3 8.9a5.3 5.3 0 0 1-10.6 0c0-2.5 2-5.2 5.3-8.9z" />,
  /* Breakfast: a sun still half below the horizon. */
  /* Three rays, not five: at 17px the side rays closed the gap to the arc and
     the whole thing read as a smudge. */
  sunrise: (
    <>
      <path d="M4.25 18.75h15.5" />
      <path d="M8.2 18.75a3.8 3.8 0 0 1 7.6 0" />
      <path d="M12 4.4v2.6M6.1 7.5l1.8 1.8M17.9 7.5l-1.8 1.8" />
    </>
  ),
  /* Lunch: the sun at its highest. */
  sun: (
    <>
      <circle cx="12" cy="12" r="3.9" />
      <path d="M12 3.1v1.9M12 19v1.9M3.1 12h1.9M19 12h1.9M5.8 5.8l1.35 1.35M16.85 16.85l1.35 1.35M18.2 5.8l-1.35 1.35M7.15 16.85 5.8 18.2" />
    </>
  ),
  /* Dinner and the evening slot: a crescent, drawn as one closed path. */
  moon: <path d="M20.1 14.5A8.3 8.3 0 0 1 9.5 3.9a8.3 8.3 0 1 0 10.6 10.6z" />,
  /* Snacks: an apple with its stem and leaf. */
  apple: (
    <>
      <path d="M12 8.6c-1-.9-2.2-1.3-3.3-1.1C6.6 7.8 5.2 9.6 5.2 12.2c0 3.5 2.5 7.1 4.4 7.1.9 0 1.5-.4 2.4-.4s1.5.4 2.4.4c1.9 0 4.4-3.6 4.4-7.1 0-2.6-1.4-4.4-3.5-4.7-1.1-.2-2.3.2-3.3 1.1z" />
      <path d="M12 8.6V6.2c0-1.1.9-2 2-2.1" />
    </>
  ),
  /* The morning snack and the evening cup: a mug with a handle. */
  teacup: (
    <>
      <path d="M4.75 8.25h11.5v5a4.5 4.5 0 0 1-4.5 4.5h-2.5a4.5 4.5 0 0 1-4.5-4.5z" />
      <path d="M16.25 10.25h1.25a2.5 2.5 0 0 1 0 5h-1.25" />
      <path d="M4.75 20.5h11.5" />
    </>
  ),
  /* A drinking glass, used at small sizes to show one glass of water. */
  glass: <path d="M6.75 4.25h10.5l-1.2 15.5H7.95z" />,
  /*
   * A curled sleeping cat, for the streak pill when the cat is in its house.
   * Drawn as one closed body with two ears and a wrapped tail rather than a
   * head-and-body pair, because at 14px two ellipses merge into a blob.
   */
  cat: (
    <>
      <path d="M4.6 16.4c0-3.1 2.8-5.5 6.2-5.5s6.2 2.4 6.2 5.5v2.1H4.6z" />
      <path d="M6.2 11.6 5.4 7.8l3 2.1M15.6 11.6l.8-3.8-3 2.1" />
      <path d="M17 18.5c1.8 0 2.9-1.1 2.9-2.6" />
    </>
  ),
  /* Its house. Paired with the cat glyph wherever the two states are shown. */
  house: (
    <>
      <path d="M3.75 10.6 12 4.25l8.25 6.35V19.5a1 1 0 0 1-1 1H4.75a1 1 0 0 1-1-1z" />
      <path d="M9.4 20.5v-4.7a2.6 2.6 0 0 1 5.2 0v4.7" />
    </>
  ),
  /* Late evening: past the moon, when the lights are off. */
  star: (
    <path d="m12 4 2.35 4.76 5.25.76-3.8 3.7.9 5.23L12 15.98l-4.7 2.47.9-5.23-3.8-3.7 5.25-.76z" />
  ),
  dash: <path d="M6 12h12" />,
}

export function Icon({
  name,
  size = 24,
  className = '',
  strokeWidth = 1.75,
  /**
   * Paints the shape as well as outlining it. `currentColor` lets one glyph
   * serve as both the empty and the filled state of the same thing — a glass
   * of water, a star — without shipping a second path that could drift from
   * the first.
   */
  fill = 'none',
}: {
  name: IconName
  size?: number
  className?: string
  strokeWidth?: number
  fill?: string
}) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {PATHS[name]}
    </svg>
  )
}

/**
 * A glyph per meal slot, so the six cards can be told apart at a glance rather
 * than by reading six labels in the same weight.
 *
 * They run the day: sunrise, a morning cup, the sun overhead, an afternoon
 * apple, the moon for dinner, a star for the late slot. Every one is distinct —
 * two slots sharing a glyph would defeat the point of having them.
 */
export const SLOT_ICONS: Record<MealSlot, IconName> = {
  breakfast: 'sunrise',
  morning_snack: 'teacup',
  lunch: 'sun',
  afternoon_snack: 'apple',
  dinner: 'moon',
  evening: 'star',
}
