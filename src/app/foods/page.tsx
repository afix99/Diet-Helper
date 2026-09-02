'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePresence } from '@/hooks/usePresence'
import { CustomFoodDialog } from '@/components/CustomFoodDialog'
import { FoodRow } from '@/components/FoodRow'
import { EmptyState, PageHeader } from '@/components/ui'
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
  const [heldAdding, addingLeaving] = usePresence(adding || null)
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

  /*
   * Her foods first. Catalogue order buried the twenty things she actually
   * eats behind four hundred she does not — and only when nothing is being
   * searched or filtered, because inside a result set the ranking that matters
   * is the one she just asked for.
   */
  const sections = useMemo(() => {
    const browsing = !query.trim() && !category
    if (!browsing) return [{ title: null, foods: shown }]
    return sectionFoods(shown, favouriteFoods(data), oftenLogged(data))
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
        {FOOD_CATEGORIES.map((c, i) => (
          <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
            {labels[i]}
          </Chip>
        ))}
      </div>

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
        active ? 'bg-primary text-on-primary' : 'bg-raised text-muted'
      }`}
    >
      {children}
    </button>
  )
}
