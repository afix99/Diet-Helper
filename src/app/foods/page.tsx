'use client'

import { useMemo, useState } from 'react'
import { usePresence } from '@/hooks/usePresence'
import { CustomFoodDialog } from '@/components/CustomFoodDialog'
import { Emoji } from '@/components/Emoji'
import { EmptyState, PageHeader } from '@/components/ui'
import { FOOD_CATEGORIES } from '@/lib/catalogue'
import { useLogging } from '@/lib/logging'
import { allFoods } from '@/lib/selectors'
import { useData } from '@/lib/store/provider'
import type { Food } from '@/lib/types'

export default function FoodsPage() {
  const { data, ready } = useData()
  const { toggleFavourite, deleteCustomFood } = useLogging()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [heldAdding, addingLeaving] = usePresence(adding || null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const foods = useMemo(() => allFoods(data), [data])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return foods.filter((f) => {
      if (category && f.category !== category) return false
      if (!q) return true
      return (
        f.name.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q) ||
        (f.notes ?? '').toLowerCase().includes(q)
      )
    })
  }, [foods, query, category])

  if (!ready) return <p className="py-20 text-center text-secondary text-faint">Loading…</p>

  return (
    <>
      <PageHeader
        title="Foods"
        subtitle={`${foods.length} items · tap for details`}
        action={
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="tap shrink-0 rounded-pill bg-primary px-4 text-tertiary font-bold text-white"
          >
            + New
          </button>
        }
      />

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search foods, categories, notes…"
        aria-label="Search foods"
        className="mb-3 w-full rounded-pill border border-line bg-surface px-4 py-3 text-body outline-none placeholder:text-faint focus:border-primary"
      />

      <div className="-mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
        <Chip active={category === null} onClick={() => setCategory(null)}>
          All
        </Chip>
        {FOOD_CATEGORIES.map((c) => (
          <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
            {c.split(' ')[0]}
          </Chip>
        ))}
      </div>

      {shown.length === 0 ? (
        <div>
          <EmptyState art="search" title="No matches" hint="Not in the list? Add it yourself." />
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="tap mx-auto block rounded-pill bg-primary px-5 py-2.5 text-secondary font-bold text-white"
          >
            {query.trim() ? `Add “${query.trim()}”` : 'Add a new food'}
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-card bg-surface shadow-card">
          {shown.map((f) => (
            <FoodCard
              key={f.id}
              food={f}
              open={expanded === f.id}
              favourite={data.favourites.includes(f.id)}
              confirmingDelete={confirmDelete === f.id}
              onToggle={() => setExpanded(expanded === f.id ? null : f.id)}
              onFavourite={() => toggleFavourite(f.id)}
              onAskDelete={() => setConfirmDelete(f.id)}
              onCancelDelete={() => setConfirmDelete(null)}
              onDelete={() => {
                deleteCustomFood(f.id)
                setConfirmDelete(null)
              }}
            />
          ))}
        </div>
      )}

      {heldAdding && (
        <CustomFoodDialog
          initialName={query.trim()}
          leaving={addingLeaving}
          onClose={() => setAdding(false)}
        />
      )}
    </>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`tap shrink-0 rounded-pill px-3 py-1.5 text-tertiary font-semibold ${
        active ? 'bg-primary text-white' : 'bg-raised text-muted'
      }`}
    >
      {children}
    </button>
  )
}

function FoodCard({
  food,
  open,
  favourite,
  confirmingDelete,
  onToggle,
  onFavourite,
  onAskDelete,
  onCancelDelete,
  onDelete,
}: {
  food: Food
  open: boolean
  favourite: boolean
  confirmingDelete: boolean
  onToggle: () => void
  onFavourite: () => void
  onAskDelete: () => void
  onCancelDelete: () => void
  onDelete: () => void
}) {
  // Only foods you added can be removed; the workbook catalogue is fixed.
  const isCustom = food.ownerId !== null
  return (
    <div className="border-b border-line last:border-0">
      <div className="flex items-stretch">
        <button type="button" onClick={onToggle} aria-expanded={open} className="tap flex-1 p-3 text-left">
          <span className="block text-secondary font-semibold">
            {food.name}
            {food.source === 'community' && (
              <span className="ml-1.5 rounded px-1 py-px align-middle text-caption font-semibold text-faint ring-1 ring-line">
                est.
              </span>
            )}
          </span>
          <span className="block text-tertiary text-faint">{food.servingSize}</span>
          <span className="mt-1 flex flex-wrap gap-x-3 text-tertiary tabular-nums text-muted">
            <span className="font-bold text-primary">{food.kcal} kcal</span>
            <span>P {food.protein}g</span>
            <span>C {food.carbs}g</span>
            <span>F {food.fat}g</span>
            {food.fibre > 0 && <span>Fibre {food.fibre}g</span>}
          </span>
        </button>
        <button
          type="button"
          onClick={onFavourite}
          aria-label={favourite ? 'Remove from favourites' : 'Save to favourites'}
          aria-pressed={favourite}
          className="tap grid w-12 place-items-center text-lg"
        >
          <Emoji name="star" size={18} className={favourite ? '' : 'opacity-30 grayscale'} />
        </button>
      </div>
      {open && (food.notes || isCustom) && (
        <div className="border-t border-line px-3 py-2">
          {food.source === 'community' && (
            <p className="mb-1 text-tertiary leading-relaxed text-faint">
              Estimated from public figures. Chain and street portions vary a lot between
              outlets, so treat this as a good guess rather than a label reading.
            </p>
          )}
          {food.notes && (
            <p className="text-tertiary leading-relaxed text-muted">
              {food.notes}
              {food.glycemicLoad !== null && food.glycemicLoad > 0 && (
                <span className="mt-1 block text-faint">
                  Glycemic load: {food.glycemicLoad}
                </span>
              )}
            </p>
          )}
          {isCustom &&
            (confirmingDelete ? (
              <div className="flex items-center gap-2">
                <span className="flex-1 text-tertiary text-muted">
                  Delete this food? Meals you already logged keep their name.
                </span>
                <button
                  type="button"
                  onClick={onDelete}
                  className="tap rounded-pill bg-clay px-3 py-1.5 text-tertiary font-bold text-white"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={onCancelDelete}
                  className="tap rounded-pill px-2 py-1.5 text-tertiary text-faint"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onAskDelete}
                className="tap text-tertiary font-semibold text-clay"
              >
                Delete this food
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
