'use client'

import Link from 'next/link'
import { Icon, type IconName } from '@/components/icons'
import { IconTile, ListGroup, ListRow, PageHeader, type TileTone } from '@/components/ui'
import { PetCat } from '@/components/PetCat'
import { PET_ENABLED, poseFor, stageFor } from '@/lib/pet'
import { useLogging } from '@/lib/logging'
import { badgesFor, entriesFor, streakFor } from '@/lib/selectors'
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
  const { callPetOut, sendPetHome } = useLogging()
  const today = todayIso()
  const unlocked = badgesFor(data, today).filter((b) => b.unlocked).length
  const stage = stageFor(streakFor(data, today).best)
  const pose = poseFor(entriesFor(data, today).length > 0)

  return (
    <>
      <PageHeader title="More" />

      {/*
        The permanent way home. Today's streak pill offers the same thing, but
        only while there is a streak to show — without this row a broken streak
        plus a hidden cat would strand it with no way back.
      */}
      {PET_ENABLED && (
      <ListGroup className="mb-4">
        <ListRow
          icon={
            <IconTile tone="primary">
              {data.pet.out ? (
                <PetCat stage={stage} pose={pose} size={26} />
              ) : (
                <Icon name="house" size={17} strokeWidth={2} />
              )}
            </IconTile>
          }
          label={data.pet.name}
          secondary={data.pet.out ? `${stage.name} · out` : `${stage.name} · at home`}
          value={data.pet.out ? 'Send home' : 'Call back'}
          onClick={() => (data.pet.out ? sendPetHome() : callPetOut())}
        />
      </ListGroup>
      )}

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
