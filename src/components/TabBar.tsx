'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/', ms: 'Hari Ini', en: 'Today', icon: '🍽️' },
  { href: '/week', ms: 'Minggu', en: 'Week', icon: '🗓️' },
  { href: '/foods', ms: 'Makanan', en: 'Foods', icon: '🔍' },
  { href: '/progress', ms: 'Progres', en: 'Progress', icon: '📈' },
  { href: '/more', ms: 'Lagi', en: 'More', icon: '⋯' },
] as const

export function TabBar() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Utama"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 backdrop-blur-lg"
    >
      <ul className="mx-auto flex w-full max-w-2xl items-stretch pb-[env(safe-area-inset-bottom)]">
        {TABS.map((tab) => {
          const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href)
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={`tap flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold ${
                  active ? 'text-salmon' : 'text-faint'
                }`}
              >
                <span aria-hidden className="text-lg leading-none">
                  {tab.icon}
                </span>
                <span>{tab.ms}</span>
                <span className="sr-only">{tab.en}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
