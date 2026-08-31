'use client'

import Link from 'next/link'
import { Icon, type IconName } from '@/components/icons'
import { IconTile, ListGroup, ListRow, PageHeader, type TileTone } from '@/components/ui'
import { badgesFor } from '@/lib/selectors'
import { useData } from '@/lib/store/provider'
import { todayIso } from '@/lib/store/defaults'

const LINKS: {
  href: string
  icon: IconName
  tone: TileTone
  label: string
  hint: string
}[] = [
  {
    href: '/more/recipes',
    icon: 'book',
    tone: 'primary',
    label: 'Recipes',
    hint: '7 salmon dishes',
  },
  {
    href: '/more/shop',
    icon: 'cart',
    tone: 'avocado',
    label: 'Shop & Prep',
    hint: 'Shopping list & Sunday prep',
  },
  {
    href: '/more/supplements',
    icon: 'pill',
    tone: 'ocean',
    label: 'Supplements & Water',
    hint: 'Hydration & micronutrients',
  },
  {
    href: '/more/badges',
    icon: 'medal',
    tone: 'amber',
    label: 'Badges',
    hint: '18 to collect',
  },
  {
    href: '/more/settings',
    icon: 'gear',
    tone: 'clay',
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
      <ListGroup>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="block">
            <ListRow
              icon={
                <IconTile tone={l.tone}>
                  <Icon name={l.icon} size={17} strokeWidth={2} />
                </IconTile>
              }
              label={l.label}
              secondary={l.hint}
              value={l.href === '/more/badges' && unlocked > 0 ? unlocked : undefined}
              chevron
            />
          </Link>
        ))}
      </ListGroup>
    </>
  )
}
