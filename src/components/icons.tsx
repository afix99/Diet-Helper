/**
 * Line icons in the SF Symbols idiom: 24px grid, stroked rather than filled,
 * round caps and joins, drawn from `currentColor` so a tab tints itself just
 * by setting a text colour.
 *
 * Original geometry — the shapes follow the conventions of the style, not
 * Apple's artwork, which isn't ours to ship.
 */

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
}

export function Icon({
  name,
  size = 24,
  className = '',
  strokeWidth = 1.75,
}: {
  name: IconName
  size?: number
  className?: string
  strokeWidth?: number
}) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
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
