'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon, type IconName } from './icons'

const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: '/', label: 'Today', icon: 'today' },
  { href: '/week', label: 'Week', icon: 'calendar' },
  { href: '/foods', label: 'Foods', icon: 'search' },
  { href: '/progress', label: 'Progress', icon: 'chart' },
  { href: '/more', label: 'More', icon: 'ellipsis' },
]

/**
 * iOS 26 floats the tab bar as an inset capsule over the content rather than
 * gluing it to the bottom edge, so the outer element is a positioning frame
 * and the capsule itself carries the glass.
 */
export function TabBar() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Main"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 pb-[calc(env(safe-area-inset-bottom)+10px)]"
    >
      <ul className="glass pointer-events-auto mx-auto flex w-[calc(100%-40px)] max-w-md items-stretch rounded-pill px-1.5 py-1.5">
        {TABS.map((tab) => {
          const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href)
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={`tap relative flex flex-col items-center justify-center gap-1 rounded-pill py-1.5 text-caption transition-colors ${
                  active ? 'text-primary-ink' : 'text-faint'
                }`}
              >
                {/* Soft pill behind the selected tab, the way iOS marks it. */}
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-0 -z-10 rounded-pill bg-primary/12"
                  />
                )}
                {/* Keyed on the tab so the pop replays each time it becomes
                    the active one, rather than only on first mount. */}
                <Icon
                  key={active ? 'on' : 'off'}
                  name={tab.icon}
                  size={23}
                  strokeWidth={active ? 2 : 1.75}
                  className={active ? 'animate-pop-in' : ''}
                />
                <span>{tab.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
