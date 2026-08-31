'use client'

import { useMemo, useState } from 'react'
import { usePresence } from '@/hooks/usePresence'
import { CustomFoodDialog } from './CustomFoodDialog'
import { burstFrom } from './BurstLayer'
import { QuickAdd } from './QuickAdd'
import { Sheet } from './ui'
import { Icon } from './icons'
import { FOOD_CATEGORIES, RECIPES } from '@/lib/catalogue'
import { useLogging } from '@/lib/logging'
import { allFoods, favouriteFoods, recentFoods } from '@/lib/selectors'
import { useData } from '@/lib/store/provider'
import { SLOT_LABELS, type Food, type MealSlot } from '@/lib/types'

/**
 * Bottom sheet for adding to a meal slot.
 *
 * Order is deliberate: recents and favourites first, search second, full
 * catalogue last. Most logging is repeat logging, so the common case should
 * cost one tap and never require typing.
 */
export function FoodPicker({
  date,
  slot,
  onClose,
  leaving,
}: {
  date: string
  slot: MealSlot
  onClose: () => void
  leaving?: boolean
}) {
  const { data } = useData()
  const { logFood, logRecipe } = useLogging()
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [heldCreating, creatingLeaving] = usePresence(creating || null)
  const [quickAdding, setQuickAdding] = useState(false)

  const foods = useMemo(() => allFoods(data), [data])
  const recents = useMemo(() => recentFoods(data, slot), [data, slot])
  const favourites = useMemo(() => favouriteFoods(data), [data])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return null
    return foods.filter(
      (f) => f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q)
    )
  }, [foods, query])

  const matchingRecipes = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return RECIPES.filter((r) => r.name.toLowerCase().includes(q))
  }, [query])

  const pick = (food: Food, from?: Element | null) => {
    logFood(date, slot, food)
    // The sheet is already closing, so the burst is thrown from where the row
    // was rather than from where nothing will be a moment later.
    burstFrom(from ?? null, food)
    onClose()
  }

  const pickRecipe = (id: string) => {
    logRecipe(date, slot, id)
    onClose()
  }

  const label = SLOT_LABELS[slot]

  // Hand off rather than stack: two nested sheets would mean two live
  // aria-modal dialogs, and iOS never layers sheets like that either.
  if (quickAdding) {
    return <QuickAdd date={date} slot={slot} onClose={onClose} leaving={leaving} />
  }

  return (
    <Sheet onClose={onClose} leaving={leaving} labelledBy="food-picker-title">
        <div className="flex items-center justify-between px-4 pb-2 pt-2">
          <div>
            <p id="food-picker-title" className="text-secondary font-bold">
              {label.label}
            </p>
            <p className="text-tertiary text-faint">Add an item</p>
          </div>
          <button type="button" onClick={onClose} className="tap px-2 text-secondary font-semibold text-primary-ink">
            Done
          </button>
        </div>

        <div className="px-4 pb-3">
          <button
            type="button"
            onClick={() => setQuickAdding(true)}
            className="tap mb-2 flex w-full items-center gap-2 rounded-pill bg-primary/10 px-4 py-2.5 text-secondary font-semibold text-primary-ink"
          >
            <Icon name="pencil" size={17} strokeWidth={2} />
            Describe a whole meal instead
          </button>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search foods and recipes…"
            aria-label="Search foods"
            className="w-full rounded-pill border border-line bg-surface px-4 py-3 text-body outline-none placeholder:text-faint focus:border-primary"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {results === null ? (
            <>
              {recents.length > 0 && (
                <Rail title="Recent" foods={recents} onPick={pick} />
              )}
              {favourites.length > 0 && (
                <Rail title="Favourites" foods={favourites} onPick={pick} />
              )}
              <RecipeRail onPick={pickRecipe} />
              {FOOD_CATEGORIES.map((cat) => (
                <CategoryBlock
                  key={cat}
                  title={cat}
                  foods={foods.filter((f) => f.category === cat)}
                  onPick={pick}
                />
              ))}
              {data.customFoods.length > 0 && (
                <CategoryBlock title="MY FOODS" foods={data.customFoods} onPick={pick} />
              )}
            </>
          ) : (
            <>
              {matchingRecipes.length > 0 && (
                <>
                  <SectionTitle title="Recipes" />
                  {matchingRecipes.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => pickRecipe(r.id)}
                      className="tap flex w-full items-center justify-between gap-3 border-b border-line py-3 text-left"
                    >
                      <span>
                        <span className="block text-secondary font-semibold">{r.name}</span>
                        <span className="block text-tertiary text-faint">{r.minutes} min</span>
                      </span>
                      <span className="text-secondary font-bold tabular-nums text-primary-ink">{r.kcal}</span>
                    </button>
                  ))}
                </>
              )}
              {results.length === 0 && matchingRecipes.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-secondary text-faint">No matches.</p>
                  {/* The moment you discover something is missing is the moment
                      you are willing to add it — so offer it right here. */}
                  <button
                    type="button"
                    onClick={() => setCreating(true)}
                    className="tap mt-3 rounded-pill bg-primary px-5 py-2.5 text-secondary font-bold text-on-primary"
                  >
                    Add &ldquo;{query.trim()}&rdquo;
                  </button>
                </div>
              ) : (
                results.map((f) => <FoodRow key={f.id} food={f} onPick={pick} />)
              )}
            </>
          )}
        </div>

      {heldCreating && (
        <CustomFoodDialog
          initialName={query.trim()}
          leaving={creatingLeaving}
          onClose={() => setCreating(false)}
          // Created straight from a search, so log it immediately.
          onCreated={(food) => {
            logFood(date, slot, food)
            onClose()
          }}
        />
      )}
    </Sheet>
  )
}

function SectionTitle({ title }: { title: string }) {
  return (
    <h3 className="sticky top-0 z-10 bg-bg py-2 text-caption font-bold uppercase tracking-wide text-faint">
      {title}
    </h3>
  )
}

/** Horizontal one-tap rail — the whole point of the picker. */
function Rail({
  title,
  foods,
  onPick,
}: {
  title: string
  foods: Food[]
  onPick: (f: Food, from?: Element | null) => void
}) {
  return (
    <div className="mb-4">
      <SectionTitle title={title} />
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {foods.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={(e) => onPick(f, e.currentTarget)}
            className="tap w-36 shrink-0 rounded-card border border-line bg-surface p-3 text-left"
          >
            <span className="block text-tertiary font-semibold leading-tight line-clamp-2">{f.name}</span>
            <span className="mt-1 block text-secondary font-bold tabular-nums text-primary-ink">
              {f.kcal}
              <span className="text-caption font-medium text-faint"> kcal</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function RecipeRail({ onPick }: { onPick: (id: string) => void }) {
  return (
    <div className="mb-4">
      <SectionTitle title="Recipes" />
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {RECIPES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onPick(r.id)}
            className="tap w-40 shrink-0 rounded-card border border-line bg-surface p-3 text-left"
          >
            <span className="block text-tertiary font-semibold leading-tight line-clamp-2">{r.name}</span>
            <span className="mt-1 block text-secondary font-bold tabular-nums text-primary-ink">
              {r.kcal}
              <span className="text-caption font-medium text-faint"> kcal · {r.minutes}m</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function CategoryBlock({
  title,
  foods,
  onPick,
}: {
  title: string
  foods: Food[]
  onPick: (f: Food, from?: Element | null) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-line">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="tap flex w-full items-center justify-between py-3 text-left"
      >
        <span className="text-tertiary font-bold uppercase tracking-wide text-muted">{title}</span>
        <span className="flex items-center gap-1 text-tertiary text-faint">
          {foods.length}
          <Icon
            name="chevron"
            size={13}
            strokeWidth={2.5}
            className={`transition-transform duration-200 ${open ? '-rotate-90' : 'rotate-90'}`}
          />
        </span>
      </button>
      {open && <div className="pb-2">{foods.map((f) => <FoodRow key={f.id} food={f} onPick={onPick} />)}</div>}
    </div>
  )
}

function FoodRow({ food, onPick }: { food: Food; onPick: (f: Food, from?: Element | null) => void }) {
  return (
    <button
      type="button"
      onClick={(e) => onPick(food, e.currentTarget)}
      className="tap flex w-full items-center justify-between gap-3 border-b border-line py-3 text-left last:border-0"
    >
      <span className="min-w-0">
        <span className="block truncate text-secondary font-semibold">{food.name}</span>
        <span className="block truncate text-tertiary text-faint">
          {food.servingSize}
          {food.protein > 0 && ` · ${food.protein}g protein`}
        </span>
      </span>
      <span className="shrink-0 text-secondary font-bold tabular-nums text-primary-ink">{food.kcal}</span>
    </button>
  )
}
