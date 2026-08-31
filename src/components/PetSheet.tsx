'use client'

import { useEffect, useMemo, useState } from 'react'
import { Sheet } from './ui'
import { Icon } from './icons'
import { PressButton } from './PressButton'
import { PetCat } from './PetCat'
import { PetWardrobe } from './PetWardrobe'
import { MAX_PET_NAME, PET_STAGES, nextStage, poseFor, stageFor } from '@/lib/pet'
import { unlockedIds, wornPieces } from '@/lib/petWardrobe'
import { useLogging } from '@/lib/logging'
import { badgesFor, entriesFor, streakFor } from '@/lib/selectors'
import { useData } from '@/lib/store/provider'

/**
 * The cat, up close: its name, every stage it has reached, and the way home.
 *
 * A sheet rather than a page — a pet does not need its own tab, and the
 * collection is seven things rather than eighteen.
 */
export function PetSheet({
  date,
  onClose,
  onSendHome,
  leaving,
}: {
  date: string
  onClose: () => void
  onSendHome: () => void
  leaving?: boolean
}) {
  const { data } = useData()
  const { renamePet, markUnlocksSeen } = useLogging()
  const run = useMemo(() => streakFor(data, date), [data, date])
  const loggedToday = useMemo(() => entriesFor(data, date).length > 0, [data, date])
  const stage = stageFor(run.best)
  const pose = poseFor(loggedToday)
  const upcoming = nextStage(run.best)
  const [name, setName] = useState(data.pet.name)

  const badges = useMemo(() => badgesFor(data, date, run.best), [data, date, run.best])
  const unlocked = useMemo(() => unlockedIds(badges, stage.index), [badges, stage.index])
  const worn = useMemo(() => wornPieces(data.pet, unlocked), [data.pet, unlocked])

  /* Opening the sheet *is* looking at the wardrobe, so the new-item dot clears
     here rather than on a separate acknowledgement the user has to find. */
  useEffect(() => {
    markUnlocksSeen([...unlocked])
  }, [unlocked, markUnlocksSeen])

  return (
    <Sheet onClose={onClose} leaving={leaving} labelledBy="pet-sheet-title">
      <div className="flex items-center justify-between px-4 pb-2 pt-2">
        <p id="pet-sheet-title" className="text-secondary font-bold">
          {data.pet.name}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="tap px-2 text-secondary font-semibold text-primary-ink"
        >
          Done
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="mb-3 grid place-items-center rounded-card bg-raised py-4">
          <PetCat stage={stage} pose={pose} size={132} worn={worn} />
          <p className="mt-1 text-secondary font-bold">{stage.name}</p>
          <p className="text-tertiary text-faint">
            Best run: {run.best} {run.best === 1 ? 'day' : 'days'}
          </p>
        </div>

        <label className="mb-4 block">
          <span className="text-tertiary font-semibold text-muted">Name</span>
          <input
            type="text"
            value={name}
            maxLength={MAX_PET_NAME}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => renamePet(name)}
            aria-label="Pet name"
            className="mt-1 w-full rounded-inner border border-line bg-surface px-3 py-2.5 text-body outline-none focus:border-primary"
          />
        </label>

        <h3 className="mb-2 text-caption font-bold uppercase tracking-wide text-faint">
          Every stage
        </h3>
        <ul className="stack mb-4 gap-1">
          {PET_STAGES.map((s) => {
            const reached = s.index <= stage.index
            return (
              <li
                key={s.index}
                className={`flex items-center gap-3 rounded-inner px-2 py-1.5 ${
                  s.index === stage.index ? 'bg-primary/10' : ''
                }`}
              >
                <span className={reached ? '' : 'opacity-25 grayscale'}>
                  <PetCat stage={s} pose="awake" size={40} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-tertiary font-semibold">{s.name}</span>
                  <span className="block text-caption text-faint">
                    {s.minStreak === 0
                      ? 'From the start'
                      : `${s.minStreak} ${s.minStreak === 1 ? 'day' : 'days'} in a row`}
                  </span>
                </span>
                {reached && (
                  <Icon
                    name="check"
                    size={15}
                    strokeWidth={2.5}
                    className="shrink-0 text-primary-ink"
                  />
                )}
              </li>
            )
          })}
        </ul>

        <PetWardrobe date={date} />

        {/*
          Said plainly, because the whole design rests on it and a user who
          worries about a pet they might let down will not enjoy having one.
        */}
        <p className="mb-4 rounded-inner bg-raised px-3 py-2 text-caption leading-relaxed text-muted">
          {data.pet.name} grows with your best run and never shrinks back. Miss a day
          and {data.pet.name} rests until you return — nothing is lost, and nothing here
          depends on eating less.
          {upcoming
            ? ` Next stage at ${upcoming.stage.minStreak} days.`
            : ' Fully grown.'}
        </p>

        <PressButton full variant="quiet" onClick={onSendHome} className="!rounded-pill">
          <Icon name="house" size={17} strokeWidth={2} />
          Send {data.pet.name} home
        </PressButton>
        <p className="mt-2 text-center text-caption text-faint">
          You can call {data.pet.name} back from the streak pill or from More.
        </p>
      </div>
    </Sheet>
  )
}
