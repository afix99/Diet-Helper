'use client'

import { useMemo } from 'react'
import { BadgeArt } from '@/components/Emoji'
import { Card, PageHeader } from '@/components/ui'
import { badgesFor, streakFor } from '@/lib/selectors'
import { useData } from '@/lib/store/provider'
import { todayIso } from '@/lib/store/defaults'

export default function BadgesPage() {
  const { data, ready } = useData()
  const today = todayIso()
  const list = useMemo(() => badgesFor(data, today), [data, today])
  const run = useMemo(() => streakFor(data, today), [data, today])

  if (!ready) return <p className="py-20 text-center text-secondary text-faint">Loading…</p>

  const unlocked = list.filter((b) => b.unlocked)

  return (
    <>
      <PageHeader
        title="Badges"
        subtitle={`${unlocked.length} of ${list.length} unlocked`}
        back={{ href: '/more', label: 'More' }}
      />

      <Card className="mb-4 text-center">
        <p className="text-5xl font-extrabold tabular-nums text-primary">
          {run.current}
          <span className="ml-1 text-body font-semibold text-muted">
            {run.current === 1 ? 'day' : 'days'}
          </span>
        </p>
        <p className="mt-1 text-secondary font-semibold">Current streak</p>
        <p className="text-tertiary text-faint">Best run: {run.best} days</p>
        {run.usingGrace ? (
          <p className="mt-2 text-tertiary text-amber">
            Missed a day — your streak is still alive. Log today to keep it going.
          </p>
        ) : (
          <p className="mt-2 text-tertiary text-faint">
            You can miss {run.graceRemaining} day this week without breaking the streak.
          </p>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-2">
        {list.map((b, i) => (
          <Card
            key={b.id}
            style={{ animationDelay: `${i * 55}ms` }}
            className={`animate-rise-in text-center ${
              b.unlocked ? 'border-primary/40 bg-primary/5' : ''
            }`}
          >
            <span className="relative mx-auto block h-16 w-16">
              {b.unlocked && (
                <span
                  aria-hidden
                  className="absolute inset-0 animate-badge-glow rounded-full bg-primary/40"
                />
              )}
              <BadgeArt
                id={b.id}
                unlocked={b.unlocked}
                size={64}
                className={`relative ${b.unlocked ? 'animate-badge-pop' : ''}`}
              />
            </span>
            <p className="mt-1 text-tertiary font-bold leading-tight">{b.name}</p>
            <p className="text-caption leading-tight text-faint">{b.requirement}</p>
            {!b.unlocked && b.progress > 0 && (
              <div className="mt-2 h-1 overflow-hidden rounded-pill bg-raised">
                <div className="h-full bg-primary/50" style={{ width: `${b.progress * 100}%` }} />
              </div>
            )}
            {b.unlocked && <p className="mt-1 text-caption font-bold text-primary">UNLOCKED</p>}
          </Card>
        ))}
      </div>
    </>
  )
}
