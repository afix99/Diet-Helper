'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Sheet } from './ui'
import { macroFate, type MacroKey } from '@/lib/macroFate'
import { dayTotals, latestWeight } from '@/lib/selectors'
import { useData } from '@/lib/store/provider'

const ENERGY_COPY = {
  deficit: { label: 'Below what you burn', tone: 'text-avocado' },
  maintenance: { label: 'About what you burn', tone: 'text-ocean' },
  surplus: { label: 'Above what you burn', tone: 'text-amber' },
  unknown: { label: 'Cannot tell yet', tone: 'text-faint' },
} as const

/**
 * The answer to "where does the food I went over on actually go?".
 *
 * The energy line sits at the top on purpose. It is the part that decides
 * whether anything is stored at all, and burying it under two paragraphs of
 * biochemistry would repeat the mistake this sheet exists to fix.
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

  const energy = ENERGY_COPY[fate.energy]

  return (
    <Sheet onClose={onClose} leaving={leaving} labelledBy="macro-fate-title">
      <div className="overflow-y-auto p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 id="macro-fate-title" className="text-body font-bold">
            {fate.headline}
          </h2>
          <button type="button" onClick={onClose} className="tap px-2 text-secondary text-faint">
            Done
          </button>
        </div>

        <div className="mb-4 rounded-xl bg-raised px-3 py-2.5">
          <p className="text-tertiary font-semibold text-faint">Today, all in</p>
          <p className={`text-body font-bold ${energy.tone}`}>{energy.label}</p>
          {fate.maintenanceKcal !== null && (
            <p className="mt-0.5 text-caption text-faint tabular-nums">
              {Math.round(fate.totalKcal).toLocaleString('en-GB')} eaten against about{' '}
              {fate.maintenanceKcal.toLocaleString('en-GB')} burned
            </p>
          )}
        </div>

        <div className="grid gap-3">
          {fate.body.map((p) => (
            <p key={p.slice(0, 32)} className="text-tertiary leading-relaxed text-muted">
              {p}
            </p>
          ))}
        </div>

        {fate.energy === 'unknown' && (
          <Link
            href="/more/settings"
            className="tap mt-3 inline-flex items-center text-tertiary font-semibold text-primary-ink underline decoration-primary-ink/30 underline-offset-4"
          >
            Add height and age
          </Link>
        )}

        <p className="mt-4 text-caption leading-relaxed text-faint">
          General nutrition information, not medical advice. Individual numbers vary, and
          anything persistent is worth raising with a doctor or dietitian.
        </p>
      </div>
    </Sheet>
  )
}
