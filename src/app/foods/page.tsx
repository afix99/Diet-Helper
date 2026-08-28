'use client'

import { useMemo, useState } from 'react'
import { Card, EmptyState, PageHeader } from '@/components/ui'
import { FOOD_CATEGORIES } from '@/lib/catalogue'
import { useLogging } from '@/lib/logging'
import { allFoods } from '@/lib/selectors'
import { useData } from '@/lib/store/provider'
import type { Food } from '@/lib/types'

export default function FoodsPage() {
  const { data, ready } = useData()
  const { toggleFavourite } = useLogging()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

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

  if (!ready) return <p className="py-20 text-center text-sm text-faint">Memuatkan…</p>

  return (
    <>
      <PageHeader ms="Makanan" en={`${foods.length} item · tap for details`} />

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cari makanan, kategori, nota…"
        aria-label="Cari makanan"
        className="mb-3 w-full rounded-pill border border-line bg-surface px-4 py-3 text-base outline-none placeholder:text-faint focus:border-salmon"
      />

      <div className="-mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
        <Chip active={category === null} onClick={() => setCategory(null)}>
          Semua
        </Chip>
        {FOOD_CATEGORIES.map((c) => (
          <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
            {c.split(' ')[0]}
          </Chip>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState emoji="🔍" ms="Tiada padanan" en="No matches — try another word" />
      ) : (
        <div className="grid gap-2">
          {shown.map((f) => (
            <FoodCard
              key={f.id}
              food={f}
              open={expanded === f.id}
              favourite={data.favourites.includes(f.id)}
              onToggle={() => setExpanded(expanded === f.id ? null : f.id)}
              onFavourite={() => toggleFavourite(f.id)}
            />
          ))}
        </div>
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
      className={`tap shrink-0 rounded-pill px-3 py-1.5 text-xs font-semibold ${
        active ? 'bg-salmon text-white' : 'bg-raised text-muted'
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
  onToggle,
  onFavourite,
}: {
  food: Food
  open: boolean
  favourite: boolean
  onToggle: () => void
  onFavourite: () => void
}) {
  return (
    <Card className="!p-0">
      <div className="flex items-stretch">
        <button type="button" onClick={onToggle} aria-expanded={open} className="tap flex-1 p-3 text-left">
          <span className="block text-sm font-semibold">{food.name}</span>
          <span className="block text-xs text-faint">{food.servingSize}</span>
          <span className="mt-1 flex flex-wrap gap-x-3 text-xs tabular-nums text-muted">
            <span className="font-bold text-salmon">{food.kcal} kcal</span>
            <span>P {food.protein}g</span>
            <span>C {food.carbs}g</span>
            <span>F {food.fat}g</span>
            {food.fibre > 0 && <span>Serat {food.fibre}g</span>}
          </span>
        </button>
        <button
          type="button"
          onClick={onFavourite}
          aria-label={favourite ? 'Buang dari kegemaran' : 'Simpan sebagai kegemaran'}
          aria-pressed={favourite}
          className="tap grid w-12 place-items-center text-lg"
        >
          <span aria-hidden className={favourite ? '' : 'opacity-25 grayscale'}>
            ⭐
          </span>
        </button>
      </div>
      {open && food.notes && (
        <p className="border-t border-line px-3 py-2 text-xs leading-relaxed text-muted">
          {food.notes}
          {food.glycemicLoad !== null && food.glycemicLoad > 0 && (
            <span className="mt-1 block text-faint">Glycemic load: {food.glycemicLoad}</span>
          )}
        </p>
      )}
    </Card>
  )
}
