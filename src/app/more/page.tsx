'use client'

import Link from 'next/link'
import { Card, PageHeader } from '@/components/ui'
import { badgesFor } from '@/lib/selectors'
import { useData } from '@/lib/store/provider'
import { todayIso } from '@/lib/store/defaults'

const LINKS = [
  { href: '/more/recipes', emoji: '👩‍🍳', ms: 'Resipi', en: 'Recipes · 7 salmon dishes' },
  { href: '/more/shop', emoji: '🛒', ms: 'Beli & Prep', en: 'Shopping list & Sunday prep' },
  {
    href: '/more/supplements',
    emoji: '💊',
    ms: 'Suplemen & Air',
    en: 'Supplements, hydration & micronutrients',
  },
  { href: '/more/badges', emoji: '🏅', ms: 'Lencana', en: 'Badges & streak' },
  { href: '/more/settings', emoji: '⚙️', ms: 'Tetapan', en: 'Profile, targets & disclaimer' },
]

export default function MorePage() {
  const { data } = useData()
  const unlocked = badgesFor(data, todayIso()).filter((b) => b.unlocked).length

  return (
    <>
      <PageHeader ms="Lagi" en="More" />
      <div className="grid gap-2">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href}>
            <Card className="flex items-center gap-3">
              <span aria-hidden className="text-xl">
                {l.emoji}
              </span>
              <span className="flex-1">
                <span className="block text-sm font-bold">{l.ms}</span>
                <span className="block text-xs text-faint">{l.en}</span>
              </span>
              {l.href === '/more/badges' && unlocked > 0 && (
                <span className="pill bg-salmon/15 text-salmon">{unlocked}</span>
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
