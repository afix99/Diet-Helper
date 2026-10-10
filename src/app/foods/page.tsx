'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePresence } from '@/hooks/usePresence'
import { CustomFoodDialog } from '@/components/CustomFoodDialog'
import { FoodRow } from '@/components/FoodRow'
import { Icon } from '@/components/icons'
import { EmptyState, PageHeader, Sheet } from '@/components/ui'
import { FOOD_CATEGORIES } from '@/lib/catalogue'
import { chipLabels, sectionFoods } from '@/lib/foodList'
import { useLogging } from '@/lib/logging'
import { allFoods, favouriteFoods } from '@/lib/selectors'
import { oftenLogged } from '@/lib/usual'
import { useData } from '@/lib/store/provider'

export default function FoodsPage() {
  const { data, ready } = useData()
  const { toggleFavourite, deleteCustomFood } = useLogging()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [filtering, setFiltering] = useState(false)
  const [heldAdding, addingLeaving] = usePresence(adding || null)
  const [heldFiltering, filteringLeaving] = usePresence(filtering || null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const foods = useMemo(() => allFoods(data), [data])

  /*
   * How many rows are actually in the DOM.
   *
   * The redesigned row is worth roughly twice the nodes of the flat one it
   * replaced — a category mark, three bar segments and four coloured values
   * instead of a line of grey text. Measured across all 441 foods that doubled
   * the page from 6,100 nodes to 12,000 and pushed the worst-case keystroke
   * from 124ms to 201ms, and it would get worse with every food pack added.
   *
   * So the list grows as you reach the end of it rather than all at once. Sixty
   * is several screens deep on the narrowest phone, so the sentinel below is
   * never visible when the page first settles, and searching almost always
   * returns fewer rows than this anyway — the cap is invisible in normal use
   * and only ever bites when someone scrolls the whole catalogue.
   */
  const PAGE = 60
  const [limit, setLimit] = useState(PAGE)
  const sentinel = useRef<HTMLDivElement>(null)

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

  /*
   * Chip labels are derived rather than sliced. `category.split(' ')[0]` used
   * to do this, and it held up until a pack arrived whose five categories all
   * begin with "SUSHI" — the filter bar then showed five identical chips, four
   * of them unreachable. See `chipLabels`.
   */
  const labels = useMemo(() => chipLabels(FOOD_CATEGORIES), [])
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const food of foods) counts.set(food.category, (counts.get(food.category) ?? 0) + 1)
    return counts
  }, [foods])

  /*
   * Her foods first. Catalogue order buried the twenty things she actually
   * eats behind four hundred she does not — and only when nothing is being
   * searched or filtered, because inside a result set the ranking that matters
   * is the one she just asked for.
   */
  const sections = useMemo(() => {
    const browsing = !query.trim() && !category
    if (!browsing) return [{ title: null, foods: shown }]
    return sectionFoods(shown, favouriteFoods(data), oftenLogged(data, { limit: 5 }))
  }, [shown, data, query, category])

  // A new search starts at the top of its own results, not wherever the last
  // one had been unrolled to.
  useEffect(() => {
    setLimit(PAGE)
  }, [query, category])

  /*
   * `ready` is in the deps for a load-bearing reason: hooks run before the
   * `!ready` early return below, so on the very first render the sentinel has
   * not mounted and this would attach to nothing. With an empty dependency
   * array it never ran again, the observer was never created, and the list sat
   * at sixty rows however far you scrolled.
   */
  useEffect(() => {
    const node = sentinel.current
    if (!node) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setLimit((n) => n + PAGE)
      },
      // Start the next batch before the end arrives, so the growth is never
      // something you watch happen.
      { rootMargin: '600px' }
    )
    io.observe(node)
    return () => io.disconnect()
  }, [ready])

  /*
   * The window applied across the sections in order, so Saved and the usuals
   * are always whole — they are short and they are the point of the ordering —
   * and only the long catch-all gets cut.
   */
  const windowed = useMemo(() => {
    let left = limit
    const out: typeof sections = []
    for (const s of sections) {
      if (left <= 0) break
      out.push(s.foods.length <= left ? s : { ...s, foods: s.foods.slice(0, left) })
      left -= s.foods.length
    }
    return out
  }, [sections, limit])

  const total = sections.reduce((n, s) => n + s.foods.length, 0)
  const more = total - windowed.reduce((n, s) => n + s.foods.length, 0)

  if (!ready) return <p className="py-20 text-center text-secondary text-faint">Loading…</p>

  return (
    <>
      <PageHeader
        title="Foods"
        subtitle={
          shown.length === foods.length
            ? `${foods.length} foods`
            : `${shown.length} of ${foods.length}`
        }
        action={
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="tap shrink-0 rounded-pill bg-primary px-4 text-tertiary font-bold text-on-primary"
          >
            + New
          </button>
        }
      />

      {/* Search owns the width; the catalogue's thirty categories move into a
          sheet rather than competing with it in a permanent chip rail. */}
      <div className="mb-3 flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Icon
            name="search"
            size={17}
            strokeWidth={2}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search foods…"
            aria-label="Search foods"
            className="w-full rounded-pill border border-line bg-surface py-3 pl-11 pr-11 text-body outline-none placeholder:text-faint focus:border-primary [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="tap absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center text-faint"
            >
              <Icon name="close" size={16} strokeWidth={2.25} />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setFiltering(true)}
          aria-label="Filter foods by category"
          aria-haspopup="dialog"
          className={`tap relative grid h-12 w-12 shrink-0 place-items-center rounded-pill border bg-surface ${
            category ? 'border-primary text-primary-ink' : 'border-line text-muted'
          }`}
        >
          <Icon name="filter" size={19} strokeWidth={2} />
          {category && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border border-surface bg-primary" />
          )}
        </button>
      </div>

      {category && (
        <div className="mb-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className="tap flex min-h-9 items-center gap-1.5 rounded-pill bg-primary/12 px-3 text-tertiary font-semibold text-primary-ink"
          >
            {labels[FOOD_CATEGORIES.indexOf(category)]}
            <Icon name="close" size={13} strokeWidth={2.25} />
          </button>
          <span className="text-caption text-faint">{shown.length} foods</span>
        </div>
      )}

      {shown.length === 0 ? (
        <div>
          <EmptyState art="search" title="No matches" hint="Not in the list? Add it yourself." />
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="tap mx-auto block rounded-pill bg-primary px-5 py-2.5 text-secondary font-bold text-on-primary"
          >
            {query.trim() ? `Add “${query.trim()}”` : 'Add a new food'}
          </button>
        </div>
      ) : (
        <div className="stack gap-4">
          {windowed.map((section) => (
            <div key={section.title ?? 'all'}>
              {section.title && (
                <h2 className="mb-1.5 px-1 text-caption font-bold uppercase tracking-wide text-faint">
                  {section.title}
                </h2>
              )}
              <div className="overflow-hidden rounded-card bg-surface shadow-card">
                {section.foods.map((f) => (
                  <FoodRow
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
            </div>
          ))}
          {/*
            The observer's target. It carries a real message rather than being
            an invisible div: if the browser has no IntersectionObserver, or a
            slow connection stalls, this still reads as "there is more" instead
            of looking like the catalogue simply ends at sixty.
          */}
          <div ref={sentinel} aria-hidden={more === 0} className="h-px">
            {more > 0 && (
              <p className="pb-2 pt-1 text-center text-caption text-faint">
                {more} more &middot; keep scrolling, or search
              </p>
            )}
          </div>
        </div>
      )}

      {heldAdding && (
        <CustomFoodDialog
          initialName={query.trim()}
          leaving={addingLeaving}
          onClose={() => setAdding(false)}
        />
      )}
      {heldFiltering && (
        <CategoryFilterSheet
          value={category}
          labels={labels}
          counts={categoryCounts}
          total={foods.length}
          leaving={filteringLeaving}
          onChange={setCategory}
          onClose={() => setFiltering(false)}
        />
      )}
    </>
  )
}

function CategoryFilterSheet({
  value,
  labels,
  counts,
  total,
  leaving,
  onChange,
  onClose,
}: {
  value: string | null
  labels: string[]
  counts: ReadonlyMap<string, number>
  total: number
  leaving: boolean
  onChange: (value: string | null) => void
  onClose: () => void
}) {
  return (
    <Sheet onClose={onClose} leaving={leaving} labelledBy="food-category-title">
      <div className="flex items-start justify-between px-4 pb-3 pt-2">
        <div>
          <h2 id="food-category-title" className="text-title">
            Food categories
          </h2>
          <p className="text-tertiary text-faint">Choose one to narrow the catalogue</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="tap px-2 py-1 text-secondary font-semibold text-primary-ink"
        >
          Done
        </button>
      </div>

      <div className="overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => {
            onChange(null)
            onClose()
          }}
          aria-pressed={value === null}
          className={`tap mb-2 flex min-h-12 w-full items-center justify-between rounded-inner px-3 text-left ${
            value === null ? 'bg-primary/12 text-primary-ink' : 'bg-surface text-ink'
          }`}
        >
          <span className="font-semibold">All foods</span>
          <span className="flex items-center gap-2 text-caption tabular-nums text-faint">
            {total}
            {value === null && <Icon name="check" size={15} strokeWidth={2.5} />}
          </span>
        </button>

        <div className="grid grid-cols-2 gap-2">
          {FOOD_CATEGORIES.map((category, i) => {
            const active = value === category
            return (
              <button
                key={category}
                type="button"
                onClick={() => {
                  onChange(category)
                  onClose()
                }}
                aria-pressed={active}
                className={`tap flex min-h-12 min-w-0 items-center justify-between gap-2 rounded-inner px-3 text-left ${
                  active ? 'bg-primary/12 text-primary-ink' : 'bg-surface text-ink'
                }`}
              >
                <span className="min-w-0 truncate text-tertiary font-semibold">{labels[i]}</span>
                <span className="shrink-0 text-caption tabular-nums text-faint">
                  {active ? (
                    <Icon name="check" size={15} strokeWidth={2.5} />
                  ) : (
                    counts.get(category) ?? 0
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </Sheet>
  )
}
