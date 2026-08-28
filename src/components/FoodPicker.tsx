'use client'

import { useMemo, useState } from 'react'
import { CustomFoodDialog } from './CustomFoodDialog'
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
}: {
  date: string
  slot: MealSlot
  onClose: () => void
}) {
  const { data } = useData()
  const { logFood, logRecipe } = useLogging()
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)

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

  const pick = (food: Food) => {
    logFood(date, slot, food)
    onClose()
  }

  const pickRecipe = (id: string) => {
    logRecipe(date, slot, id)
    onClose()
  }

  const label = SLOT_LABELS[slot]

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
      />
      <div className="relative flex max-h-[88dvh] flex-col rounded-t-[1.75rem] border-t border-line bg-bg shadow-lift animate-slide-up">
        <div className="flex items-center justify-between px-4 pb-2 pt-3">
          <div>
            <p className="text-secondary font-bold">{label.label}</p>
            <p className="text-tertiary text-faint">Add an item</p>
          </div>
          <button type="button" onClick={onClose} className="tap px-2 text-secondary font-semibold text-primary">
            Done
          </button>
        </div>

        <div className="px-4 pb-3">
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
                      <span className="text-secondary font-bold tabular-nums text-primary">{r.kcal}</span>
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
                    className="tap mt-3 rounded-pill bg-primary px-5 py-2.5 text-secondary font-bold text-white"
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
      </div>

      {creating && (
        <CustomFoodDialog
          initialName={query.trim()}
          onClose={() => setCreating(false)}
          // Created straight from a search, so log it immediately.
          onCreated={(food) => {
            logFood(date, slot, food)
            onClose()
          }}
        />
      )}
    </div>
  )
}

function SectionTitle({ title }: { title: string }) {
  return (
    <h3 className="sticky top-0 z-10 bg-bg py-2 text-[11px] font-bold uppercase tracking-wide text-faint">
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
  onPick: (f: Food) => void
}) {
  return (
    <div className="mb-4">
      <SectionTitle title={title} />
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {foods.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onPick(f)}
            className="tap w-36 shrink-0 rounded-card border border-line bg-surface p-3 text-left"
          >
            <span className="block text-tertiary font-semibold leading-tight line-clamp-2">{f.name}</span>
            <span className="mt-1 block text-secondary font-bold tabular-nums text-primary">
              {f.kcal}
              <span className="text-[10px] font-medium text-faint"> kcal</span>
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
            <span className="mt-1 block text-secondary font-bold tabular-nums text-primary">
              {r.kcal}
              <span className="text-[10px] font-medium text-faint"> kcal · {r.minutes}m</span>
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
  onPick: (f: Food) => void
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
        <span className="text-tertiary text-faint">
          {foods.length} <span aria-hidden>{open ? '▲' : '▼'}</span>
        </span>
      </button>
      {open && <div className="pb-2">{foods.map((f) => <FoodRow key={f.id} food={f} onPick={onPick} />)}</div>}
    </div>
  )
}

function FoodRow({ food, onPick }: { food: Food; onPick: (f: Food) => void }) {
  return (
    <button
      type="button"
      onClick={() => onPick(food)}
      className="tap flex w-full items-center justify-between gap-3 border-b border-line py-3 text-left last:border-0"
    >
      <span className="min-w-0">
        <span className="block truncate text-secondary font-semibold">{food.name}</span>
        <span className="block truncate text-tertiary text-faint">
          {food.servingSize}
          {food.protein > 0 && ` · ${food.protein}g protein`}
        </span>
      </span>
      <span className="shrink-0 text-secondary font-bold tabular-nums text-primary">{food.kcal}</span>
    </button>
  )
}
