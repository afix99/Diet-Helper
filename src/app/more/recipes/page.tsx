'use client'

import { useState } from 'react'
import { BackLink } from '@/components/BackLink'
import { Card, PageHeader } from '@/components/ui'
import { RECIPES } from '@/lib/catalogue'
import { useLogging } from '@/lib/logging'
import { todayIso } from '@/lib/store/defaults'
import { MEAL_SLOTS, SLOT_LABELS, type MealSlot } from '@/lib/types'

export default function RecipesPage() {
  const { logRecipe } = useLogging()
  const [open, setOpen] = useState<string | null>(null)
  const [logging, setLogging] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const log = (recipeId: string, slot: MealSlot) => {
    logRecipe(todayIso(), slot, recipeId)
    setLogging(null)
    setToast(`Ditambah ke ${SLOT_LABELS[slot].ms}`)
    setTimeout(() => setToast(null), 2200)
  }

  return (
    <>
      <BackLink />
      <PageHeader ms="Resipi" en="All under 20 min active time" />

      <div className="grid gap-3">
        {RECIPES.map((r) => {
          const isOpen = open === r.id
          return (
            <Card key={r.id}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : r.id)}
                aria-expanded={isOpen}
                className="tap w-full text-left"
              >
                <span className="block text-sm font-bold">{r.name}</span>
                <span className="mt-1 flex flex-wrap gap-x-3 text-xs tabular-nums text-muted">
                  <span className="font-bold text-salmon">{r.kcal} kcal</span>
                  <span>{r.minutes} min</span>
                  <span>P {r.protein}g</span>
                  <span>C {r.carbs}g</span>
                  <span>F {r.fat}g</span>
                </span>
              </button>

              {isOpen && (
                <div className="mt-3 border-t border-line pt-3 text-sm">
                  <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-faint">
                    Bahan · Ingredients
                  </h3>
                  <ul className="mb-3 grid gap-0.5">
                    {r.ingredients.map((ing) => (
                      <li key={ing} className="flex gap-2 text-xs">
                        <span aria-hidden className="text-salmon">
                          •
                        </span>
                        <span>{ing}</span>
                      </li>
                    ))}
                  </ul>

                  <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-faint">
                    Cara · Steps
                  </h3>
                  <ol className="mb-3 grid gap-1.5">
                    {r.steps.map((step, i) => (
                      <li key={step} className="flex gap-2 text-xs leading-relaxed">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-pill bg-salmon/15 text-[10px] font-bold text-salmon">
                          {i + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>

                  {r.chefsNote && (
                    <p className="mb-3 rounded-card bg-raised p-2.5 text-xs leading-relaxed text-muted">
                      <span className="font-bold">Nota chef: </span>
                      {r.chefsNote}
                    </p>
                  )}

                  {logging === r.id ? (
                    <div className="flex flex-wrap gap-1.5">
                      {MEAL_SLOTS.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => log(r.id, slot)}
                          className="tap rounded-pill bg-raised px-3 py-1.5 text-xs font-semibold"
                        >
                          {SLOT_LABELS[slot].ms}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setLogging(null)}
                        className="tap rounded-pill px-3 py-1.5 text-xs text-faint"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setLogging(r.id)}
                      className="tap w-full rounded-pill bg-salmon py-2.5 text-sm font-bold text-white"
                    >
                      Masak ni hari ini
                    </button>
                  )}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {toast && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-24 z-50 animate-slide-up rounded-pill bg-ink px-4 py-3 text-center text-sm font-semibold text-bg shadow-lift"
        >
          {toast}
        </div>
      )}
    </>
  )
}
