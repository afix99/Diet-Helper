'use client'

import { useMemo } from 'react'
import { BadgeArt } from '@/components/Emoji'
import { Card, PageHeader } from '@/components/ui'
import { badgesFor, streakFor } from '@/lib/selectors'
import { flourishesOn } from '@/lib/motion'
import { useData } from '@/lib/store/provider'
import { todayIso } from '@/lib/store/defaults'

/*
 * Tailwind needs these class names to exist as literal strings somewhere it can
 * see them, so a template built at runtime would be purged out of the CSS. The
 * map is that literal, and the check in scripts/check-badges.mjs asserts every
 * badge has an entry.
 */
const ARRIVAL: Record<string, string> = {
  first_step: 'animate-won-first-step',
  three_in_a_row: 'animate-won-three-in-a-row',
  full_week: 'animate-won-full-week',
  two_weeks: 'animate-won-two-weeks',
  thirty_days: 'animate-won-thirty-days',
  comeback: 'animate-won-comeback',
  omega_squad: 'animate-won-omega-squad',
  protein_power: 'animate-won-protein-power',
  fibre_friend: 'animate-won-fibre-friend',
  hydrated: 'animate-won-hydrated',
  disiplin: 'animate-won-disiplin',
  explorer: 'animate-won-explorer',
  well_rounded: 'animate-won-well-rounded',
  home_cook: 'animate-won-home-cook',
  down_1kg: 'animate-won-down-1kg',
  down_3kg: 'animate-won-down-3kg',
  down_5kg: 'animate-won-down-5kg',
  goal_reached: 'animate-won-goal-reached',
}

export default function BadgesPage() {
  const { data, ready } = useData()
  const today = todayIso()
  const run = useMemo(() => streakFor(data, today), [data, today])
  const list = useMemo(() => badgesFor(data, today, run.best), [data, today, run.best])

  if (!ready) return <p className="py-20 text-center text-secondary text-faint">Loading…</p>

  // Calm keeps the case readable and drops the choreography.
  const full = flourishesOn()

  const unlocked = list.filter((b) => b.unlocked)

  return (
    <>
      <PageHeader
        title="Badges"
        subtitle={`${unlocked.length} of ${list.length} unlocked`}
        back={{ href: '/more', label: 'More' }}
      />

      <Card className="mb-4 text-center">
        <p className="text-5xl font-extrabold tabular-nums text-primary-ink">
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
        {/* The stagger caps out: with 18 badges an uncapped delay left the
            last one waiting almost a second, which is a loading screen, not a
            flourish. */}
        {list.map((b, i) => (
          <Card
            key={b.id}
            style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
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
                className={`relative ${
                  b.unlocked ? (full && ARRIVAL[b.id]) || 'animate-badge-pop' : ''
                }`}
              />
            </span>
            <p className="mt-1 text-tertiary font-bold leading-tight">{b.name}</p>
            <p className="text-caption leading-tight text-faint">{b.requirement}</p>
            {!b.unlocked && b.progress > 0 && (
              <div className="mt-2 h-1 overflow-hidden rounded-pill bg-raised">
                <div className="h-full bg-primary/50" style={{ width: `${b.progress * 100}%` }} />
              </div>
            )}
            {b.unlocked && <p className="mt-1 text-caption font-bold text-primary-ink">UNLOCKED</p>}
          </Card>
        ))}
      </div>
    </>
  )
}
