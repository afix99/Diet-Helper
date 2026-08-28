'use client'

import { useState } from 'react'
import { useLogging } from '@/lib/logging'
import { Sheet } from './ui'
import type { Food } from '@/lib/types'

const CATEGORY = 'MY FOODS'

interface Draft {
  name: string
  servingSize: string
  kcal: string
  protein: string
  carbs: string
  fat: string
  fibre: string
}

const EMPTY: Draft = {
  name: '',
  servingSize: '',
  kcal: '',
  protein: '',
  carbs: '',
  fat: '',
  fibre: '',
}

const num = (v: string) => {
  const n = Number.parseFloat(v)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

/**
 * Adds a food the 69-item catalogue doesn't have.
 *
 * Only name and calories are required — asking for a full macro breakdown up
 * front is the kind of friction that stops people logging at all, and a rough
 * entry beats a skipped meal.
 */
export function CustomFoodDialog({
  initialName = '',
  onClose,
  onCreated,
}: {
  initialName?: string
  onClose: () => void
  onCreated?: (food: Food) => void
}) {
  const { addCustomFood } = useLogging()
  const [draft, setDraft] = useState<Draft>({ ...EMPTY, name: initialName })

  const set = (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft((d) => ({ ...d, [key]: e.target.value }))

  const nameOk = draft.name.trim().length > 0
  const kcalOk = draft.kcal.trim().length > 0 && num(draft.kcal) > 0
  const canSave = nameOk && kcalOk

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    const food: Omit<Food, 'id' | 'slug' | 'ownerId'> = {
      category: CATEGORY,
      name: draft.name.trim(),
      servingSize: draft.servingSize.trim() || '1 serving',
      kcal: num(draft.kcal),
      protein: num(draft.protein),
      carbs: num(draft.carbs),
      fat: num(draft.fat),
      fibre: num(draft.fibre),
      glycemicLoad: null,
      notes: null,
      source: 'custom',
    }
    const id = addCustomFood(food)
    onCreated?.({ ...food, id, slug: id, ownerId: 'local' })
    onClose()
  }

  return (
    <Sheet onClose={onClose} labelledBy="new-food-title" className="z-[60]">
      <form
        onSubmit={save}
        className="overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 id="new-food-title" className="text-body font-bold">
            New food
          </h2>
          <button type="button" onClick={onClose} className="tap px-2 text-secondary text-faint">
            Cancel
          </button>
        </div>

        <label className="mb-3 block">
          <span className="mb-1 block text-tertiary font-semibold">
            Name <span className="text-primary">*</span>
          </span>
          <input
            autoFocus
            value={draft.name}
            onChange={set('name')}
            placeholder="e.g. Mak's rendang"
            className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-body outline-none focus:border-primary"
          />
        </label>

        <label className="mb-3 block">
          <span className="mb-1 block text-tertiary font-semibold">Serving size</span>
          <input
            value={draft.servingSize}
            onChange={set('servingSize')}
            placeholder="1 plate · 150g · 1 cup"
            className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-body outline-none focus:border-primary"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Calories (kcal)"
            required
            value={draft.kcal}
            onChange={set('kcal')}
          />
          <Field label="Protein (g)" value={draft.protein} onChange={set('protein')} />
          <Field label="Carbs (g)" value={draft.carbs} onChange={set('carbs')} />
          <Field label="Fat (g)" value={draft.fat} onChange={set('fat')} />
          <Field label="Fibre (g)" value={draft.fibre} onChange={set('fibre')} />
        </div>

        <p className="mt-2 text-caption leading-snug text-faint">
          Only name and calories are needed. Leave a macro blank and it counts as zero — a
          rough entry is better than a skipped meal.
        </p>

        <button
          type="submit"
          disabled={!canSave}
          className="tap mt-4 w-full rounded-pill bg-primary py-3 text-secondary font-bold text-white disabled:opacity-40"
        >
          Save food
        </button>
      </form>
    </Sheet>
  )
}

function Field({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-tertiary font-semibold">
        {label} {required && <span className="text-primary">*</span>}
      </span>
      <input
        type="number"
        inputMode="decimal"
        min="0"
        step="0.1"
        value={value}
        onChange={onChange}
        placeholder="0"
        className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-body tabular-nums outline-none focus:border-primary"
      />
    </label>
  )
}
