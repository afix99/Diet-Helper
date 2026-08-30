'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Sheet } from './ui'
import { macroFate, type MacroKey } from '@/lib/macroFate'
import { dayTotals, latestWeight } from '@/lib/selectors'
import { useData } from '@/lib/store/provider'

/** Green for a deficit, amber for a surplus. Colour only — the words carry it. */
const ENERGY_TONE = {
  deficit: 'text-avocado',
  maintenance: 'text-ocean',
  surplus: 'text-amber',
  unknown: 'text-muted',
} as const

/**
 * The answer to "where does the food I went over on actually go?".
 *
 * The verdict is the first and largest thing on the sheet. It is the part that
 * decides whether anything is stored at all, and the first version buried it
 * under two paragraphs of biochemistry — which repeated the exact mistake this
 * sheet exists to fix. Everything under it is one glance long.
 */
export function MacroFateSheet({
  date,
  macro,
  onClose,
  leaving,
}: {
  date: string
  macro: MacroKey
  onClose: () => void
  leaving?: boolean
}) {
  const { data } = useData()

  const fate = useMemo(
    () =>
      macroFate(
        {
          totals: dayTotals(data, date),
          targets: data.targets,
          profile: data.profile,
          latestWeightKg: latestWeight(data),
        },
        macro
      ),
    [data, date, macro]
  )

  return (
    <Sheet onClose={onClose} leaving={leaving} labelledBy="macro-fate-title">
      <div className="overflow-y-auto p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id="macro-fate-title" className="text-body font-bold">
            {fate.headline}
          </h2>
          <button type="button" onClick={onClose} className="tap px-2 text-secondary text-faint">
            Done
          </button>
        </div>

        <p className={`text-xl font-extrabold leading-tight ${ENERGY_TONE[fate.energy]}`}>
          {fate.verdict.line}
        </p>
        <p className="mt-1 text-tertiary leading-relaxed text-muted">{fate.verdict.detail}</p>

        {fate.energy === 'unknown' && (
          <Link
            href="/more/settings"
            className="tap mt-1 inline-flex items-center text-tertiary font-semibold text-primary-ink underline decoration-primary-ink/30 underline-offset-4"
          >
            Add height and age
          </Link>
        )}

        <ul className="mt-5 stack gap-3">
          {fate.steps.map((s) => (
            <li key={s.lead} className="border-l-[3px] border-line pl-3">
              <p className="text-secondary font-bold">{s.lead}</p>
              <p className="mt-0.5 text-tertiary leading-relaxed text-muted">{s.detail}</p>
            </li>
          ))}
        </ul>

        <p className="mt-5 text-caption leading-relaxed text-faint">{fate.footer}</p>
      </div>
    </Sheet>
  )
}
