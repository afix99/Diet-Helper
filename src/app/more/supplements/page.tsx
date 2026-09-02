'use client'

import { useState } from 'react'
import { Emoji } from '@/components/Emoji'
import { Card, ListGroup, PageHeader, SegmentedControl } from '@/components/ui'
import { Icon } from '@/components/icons'
import { SUPPLEMENTS } from '@/lib/seedDefaults'
import { useData } from '@/lib/store/provider'
import { todayIso } from '@/lib/store/defaults'

type Tab = 'supplements' | 'hydration' | 'micro' | 'caffeine'

export default function SupplementsPage() {
  const { data, ready, update } = useData()
  const [tab, setTab] = useState<Tab>('supplements')
  const date = todayIso()

  const takenToday = data.supplements[date] ?? []
  const tickedToday = data.micronutrients[date] ?? []

  const toggleSupplement = (name: string) =>
    update((d) => {
      const current = d.supplements[date] ?? []
      return {
        ...d,
        supplements: {
          ...d.supplements,
          [date]: current.includes(name)
            ? current.filter((s) => s !== name)
            : [...current, name],
        },
      }
    })

  const toggleNutrient = (name: string) =>
    update((d) => {
      const current = d.micronutrients[date] ?? []
      return {
        ...d,
        micronutrients: {
          ...d.micronutrients,
          [date]: current.includes(name)
            ? current.filter((s) => s !== name)
            : [...current, name],
        },
      }
    })

  if (!ready) return <p className="py-20 text-center text-secondary text-faint">Loading…</p>

  return (
    <>
      <PageHeader
        title="Supplements & Water"
        subtitle="Hydration & micronutrients"
        back={{ href: '/more', label: 'More' }}
      />

      <Card className="mb-4 border-amber/40 bg-amber/5">
        <p className="text-tertiary leading-relaxed text-muted">
          <span className="font-bold">Food first.</span> Supplements close gaps; they don&apos;t
          replace real food. Talk to a registered dietitian before starting anything new.
        </p>
      </Card>

      <SegmentedControl
        label="Supplement sections"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'supplements', label: 'Supps' },
          { value: 'hydration', label: 'Water' },
          { value: 'micro', label: 'Micro' },
          { value: 'caffeine', label: 'Caffeine' },
        ]}
      />

      {tab === 'supplements' && (
        <ListGroup
          header={`${takenToday.length} of ${SUPPLEMENTS.supplements.length} taken today`}
        >
          {SUPPLEMENTS.supplements.map((s) => {
            const taken = takenToday.includes(s.name)
            return (
              <div key={s.name} className="[&+div]:border-t [&+div]:border-line">
                <button
                  type="button"
                  onClick={() => toggleSupplement(s.name)}
                  aria-pressed={taken}
                  className="tap-row flex w-full items-start gap-3 px-4 py-2.5 text-left"
                >
                  <span
                    aria-hidden
                    className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border text-caption font-bold ${
                      taken ? 'border-avocado bg-avocado text-on-primary' : 'border-line text-transparent'
                    }`}
                  >
                    {taken && <Icon name="check" size={13} strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-secondary font-bold">{s.name}</span>
                    <span className="block text-tertiary font-semibold text-primary-ink">{s.dose}</span>
                    <span className="mt-1 block text-tertiary text-muted">{s.purpose}</span>
                    <span className="mt-1 flex items-center gap-1 text-tertiary text-faint">
                      <Emoji name="clock" size={12} />
                      {s.timing}
                    </span>
                    {s.foodAlternative && (
                      <span className="mt-1 block text-tertiary text-faint">
                        <Emoji name="salad" size={12} className="mr-1" />
                        From food: {s.foodAlternative}
                      </span>
                    )}
                  </span>
                </button>
              </div>
            )
          })}
        </ListGroup>
      )}

      {tab === 'hydration' && (
        <ListGroup
          header="Suggested schedule"
          footer="Log what you actually drink on the Today screen."
        >
          {SUPPLEMENTS.hydration.map((h) => (
            <div key={h.time} className="px-4 py-2.5 [&+div]:border-t [&+div]:border-line">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-secondary font-bold tabular-nums text-ocean">{h.time}</p>
                <p className="text-tertiary font-semibold tabular-nums text-muted">
                  {h.volumeMl} ml
                </p>
              </div>
              <p className="mt-0.5 text-body">{h.beverage}</p>
              {h.notes && <p className="mt-0.5 text-tertiary text-faint">{h.notes}</p>}
            </div>
          ))}
        </ListGroup>
      )}

      {tab === 'micro' && (
        <ListGroup
          header={`Daily checklist · ${tickedToday.length}/${SUPPLEMENTS.micronutrients.length}`}
        >
          <ul>
            {SUPPLEMENTS.micronutrients.map((m) => {
              const ticked = tickedToday.includes(m.nutrient)
              return (
                <li key={m.nutrient}>
                  <button
                    type="button"
                    onClick={() => toggleNutrient(m.nutrient)}
                    aria-pressed={ticked}
                    className="tap-row flex w-full items-start gap-3 px-4 py-2.5 text-left"
                  >
                    <span
                      aria-hidden
                      className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border text-caption font-bold ${
                        ticked
                          ? 'border-avocado bg-avocado text-on-primary'
                          : 'border-line text-transparent'
                      }`}
                    >
                      {ticked && <Icon name="check" size={13} strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span
                          className={`text-secondary font-semibold ${ticked ? 'text-faint' : ''}`}
                        >
                          {m.nutrient}
                        </span>
                        <span className="shrink-0 text-tertiary tabular-nums text-primary-ink">
                          {m.target}
                        </span>
                      </span>
                      <span className="block text-tertiary text-faint">{m.sources}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </ListGroup>
      )}

      {tab === 'caffeine' && (
        <div>
          <ListGroup header="Caffeine content">
            <ul>
              {SUPPLEMENTS.caffeine.map((c) => (
                <li
                  key={c.beverage}
                  className="flex items-center gap-2 px-4 py-2.5 [&+li]:border-t [&+li]:border-line"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-secondary font-semibold">{c.beverage}</span>
                    <span className="block text-tertiary text-faint">{c.serving}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-secondary font-bold tabular-nums text-primary-ink">
                      {c.caffeineMg}
                      <span className="text-caption font-medium text-faint"> mg</span>
                    </span>
                    <span className="block text-caption text-faint">{c.max}</span>
                  </span>
                </li>
              ))}
            </ul>
          </ListGroup>
          {SUPPLEMENTS.caffeineCutoff && (
            <Card className="border-amber/40 bg-amber/5">
              <p className="text-tertiary leading-relaxed text-muted">
                <Emoji name="clock" size={12} className="mr-1" />
                {SUPPLEMENTS.caffeineCutoff}
              </p>
            </Card>
          )}
        </div>
      )}
    </>
  )
}
