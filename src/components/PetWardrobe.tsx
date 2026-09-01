'use client'

import { useMemo, useState } from 'react'
import { SegmentedControl } from './ui'
import { Icon } from './icons'
import { PetCat } from './PetCat'
import { sound } from '@/lib/sound'
import { stageFor } from '@/lib/pet'
import { badgesFor, streakFor } from '@/lib/selectors'
import { useLogging } from '@/lib/logging'
import { useData } from '@/lib/store/provider'
import {
  COSTUMES,
  SLOTS,
  SLOT_NAMES,
  looseAccessories,
  requirementFor,
  unlockedIds,
  wornPieces,
} from '@/lib/petWardrobe'
import type { AccessorySlot } from '@/lib/types'

/**
 * The wardrobe.
 *
 * Eighteen badges sat in a case doing nothing; this is the job they now have.
 * Every item is shown, earned or not, because a hidden reward is not a reason
 * to do anything — the locked ones carry the badge's *own* requirement line, so
 * the wardrobe doubles as a second, more motivating view of the badge case.
 *
 * The preview swatches are the real cat wearing the real piece, at 44px. A
 * separate icon set would be a second drawing to keep in sync with the first,
 * and would quietly stop matching.
 */
export function PetWardrobe({ date }: { date: string }) {
  const { data } = useData()
  const { wearItem, removeItem, wearCostume, takeOffCostume } = useLogging()
  const [slot, setSlot] = useState<AccessorySlot>('head')

  const run = useMemo(() => streakFor(data, date), [data, date])
  const badges = useMemo(() => badgesFor(data, date, run.best), [data, date, run.best])
  const stage = stageFor(run.best)
  const unlocked = useMemo(
    () => unlockedIds(badges, stage.index),
    [badges, stage.index]
  )
  const worn = useMemo(() => wornPieces(data.pet, unlocked), [data.pet, unlocked])

  const items = looseAccessories(slot)
  const chosen = worn[slot]

  return (
    <div className="mb-4">
      <h3 className="mb-2 text-caption font-bold uppercase tracking-wide text-faint">
        Costumes
      </h3>
      <ul className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {COSTUMES.map((c) => {
          const open = unlocked.has(c.id)
          const on = data.pet.costume === c.id
          return (
            <li key={c.id} className="shrink-0">
              <button
                type="button"
                disabled={!open}
                aria-pressed={on}
                onClick={() => {
                  if (on) {
                    takeOffCostume()
                    sound('undo')
                  } else {
                    wearCostume(c.id)
                    sound('pet')
                  }
                }}
                className={`grid w-[100px] place-items-center rounded-card px-1.5 py-2 text-caption ${
                  on ? 'bg-primary/15 ring-1 ring-primary' : 'bg-raised'
                } ${open ? 'tap' : 'opacity-40'}`}
              >
                <span className={open ? '' : 'grayscale'}>
                  <PetCat
                    stage={stage}
                    pose="awake"
                    size={44}
                    worn={costumeLook(c.id, unlocked)}
                  />
                </span>
                <span className="mt-0.5 truncate font-semibold text-muted">{c.name}</span>
                {!open && (
                  <span className="mt-0.5 line-clamp-3 text-[10px] leading-tight text-faint">
                    {requirementFor(c.id, badges)}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>

      <h3 className="mb-2 text-caption font-bold uppercase tracking-wide text-faint">
        Wardrobe
      </h3>
      <SegmentedControl
        label="Accessory slot"
        value={slot}
        onChange={setSlot}
        options={SLOTS.map((s) => ({ value: s, label: SLOT_NAMES[s] }))}
      />

      <ul className="grid grid-cols-3 gap-2">
        {/* "None" is an item, not the absence of one — an empty slot has to be
            as easy to choose as a full one. */}
        <li>
          <button
            type="button"
            aria-pressed={chosen === null}
            onClick={() => {
              removeItem(slot)
              sound('undo')
            }}
            className={`tap grid h-full w-full place-items-center rounded-card px-1.5 py-3 text-caption ${
              chosen === null ? 'bg-primary/15 ring-1 ring-primary' : 'bg-raised'
            }`}
          >
            <Icon name="close" size={20} strokeWidth={2} className="text-faint" />
            <span className="mt-1 font-semibold text-muted">None</span>
          </button>
        </li>

        {items.map((a) => {
          const open = unlocked.has(a.id)
          const on = chosen === a.id
          return (
            <li key={a.id}>
              <button
                type="button"
                disabled={!open}
                aria-pressed={on}
                aria-label={open ? a.name : `${a.name}, locked`}
                onClick={() => {
                  wearItem(a.slot, a.id)
                  sound('pet')
                }}
                className={`grid h-full w-full place-items-center rounded-card px-1.5 py-2 text-caption ${
                  on ? 'bg-primary/15 ring-1 ring-primary' : 'bg-raised'
                } ${open ? 'tap' : 'opacity-45'}`}
              >
                <span className={open ? '' : 'grayscale'}>
                  <PetCat stage={stage} pose="awake" size={44} worn={{ [a.slot]: a.id }} />
                </span>
                <span className="mt-0.5 truncate font-semibold text-muted">{a.name}</span>
                {!open && (
                  <span className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-faint">
                    {requirementFor(a.id, badges)}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** A costume's own pieces, for its preview swatch. */
function costumeLook(id: string, unlocked: ReadonlySet<string>) {
  return wornPieces(
    { name: '', out: true, seenStage: 0, worn: {}, costume: id, seenUnlocks: [], greeted: true },
    new Set([...unlocked, id])
  )
}
