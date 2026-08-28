'use client'

import Link from 'next/link'
import { Card, PageHeader } from '@/components/ui'
import { badgesFor } from '@/lib/selectors'
import { useData } from '@/lib/store/provider'
import { todayIso } from '@/lib/store/defaults'

const LINKS = [
  { href: '/more/recipes', emoji: '👩‍🍳', label: 'Recipes', hint: '7 salmon dishes' },
  { href: '/more/shop', emoji: '🛒', label: 'Shop & Prep', hint: 'Shopping list & Sunday prep' },
  {
    href: '/more/supplements',
    emoji: '💊',
    label: 'Supplements & Water',
    hint: 'Hydration & micronutrients',
  },
  { href: '/more/badges', emoji: '🏅', label: 'Badges', hint: 'Streak & achievements' },
  {
    href: '/more/settings',
    emoji: '⚙️',
    label: 'Settings',
    hint: 'Calorie target, weight, reset',
  },
]

export default function MorePage() {
  const { data } = useData()
  const unlocked = badgesFor(data, todayIso()).filter((b) => b.unlocked).length

  return (
    <>
      <PageHeader title="More" />
      <div className="grid gap-2">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href}>
            <Card className="flex items-center gap-3">
              <span aria-hidden className="text-xl">
                {l.emoji}
              </span>
              <span className="flex-1">
                <span className="block text-sm font-bold">{l.label}</span>
                <span className="block text-xs text-faint">{l.hint}</span>
              </span>
              {l.href === '/more/badges' && unlocked > 0 && (
                <span className="pill bg-primary/15 text-primary">{unlocked}</span>
              )}
              <span aria-hidden className="text-faint">
                ›
              </span>
            </Card>
          </Link>
        ))}
      </div>
    </>
  )
}
