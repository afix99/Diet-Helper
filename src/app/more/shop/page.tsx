'use client'

import { useMemo, useState } from 'react'
import { BackLink } from '@/components/BackLink'
import { Card, PageHeader } from '@/components/ui'
import { PREP, RECIPES, VENDORS } from '@/lib/catalogue'
import { entriesFor, weekOf } from '@/lib/selectors'
import { useData } from '@/lib/store/provider'
import { defaultShopping, todayIso } from '@/lib/store/defaults'
import type { ShoppingItem } from '@/lib/store/types'

type Tab = 'list' | 'prep' | 'vendors'

export default function ShopPage() {
  const { data, ready, update } = useData()
  const [tab, setTab] = useState<Tab>('list')
  const [note, setNote] = useState<string | null>(null)

  const toggle = (id: string) =>
    update((d) => ({
      ...d,
      shopping: d.shopping.map((s) => (s.id === id ? { ...s, checked: !s.checked } : s)),
    }))

  const reset = () =>
    update((d) => ({ ...d, shopping: d.shopping.map((s) => ({ ...s, checked: false })) }))

  const restoreDefaults = () => update((d) => ({ ...d, shopping: defaultShopping() }))

  /**
   * Pull the ingredients of every recipe planned this week into the list.
   * This is the thing the workbook fundamentally could not do: its checklist
   * was a fixed column, disconnected from what you actually planned to cook.
   */
  const addFromPlan = () => {
    const planned = new Set<string>()
    for (const date of weekOf(todayIso())) {
      for (const entry of entriesFor(data, date)) {
        if (entry.recipeId) planned.add(entry.recipeId)
      }
    }
    if (planned.size === 0) {
      setNote('Belum ada resipi dalam rancangan minggu ini.')
      setTimeout(() => setNote(null), 2600)
      return
    }
    const wanted = new Map<string, string>()
    for (const id of planned) {
      const recipe = RECIPES.find((r) => r.id === id)
      if (!recipe) continue
      for (const ing of recipe.ingredients) wanted.set(ing.toLowerCase(), ing)
    }
    update((d) => {
      const existing = new Set(d.shopping.map((s) => s.item.toLowerCase()))
      const added: ShoppingItem[] = [...wanted.entries()]
        .filter(([key]) => !existing.has(key))
        .map(([, item], i) => ({
          id: `plan-${Date.now()}-${i}`,
          category: 'DARI RANCANGAN',
          item,
          qty: null,
          estCostRm: null,
          vendor: null,
          priority: 'ESSENTIAL',
          checked: false,
        }))
      if (added.length === 0) {
        setNote('Semua bahan dah ada dalam senarai.')
        setTimeout(() => setNote(null), 2600)
        return d
      }
      setNote(`${added.length} bahan ditambah dari rancangan.`)
      setTimeout(() => setNote(null), 2600)
      return { ...d, shopping: [...d.shopping, ...added] }
    })
  }

  const grouped = useMemo(() => {
    const map = new Map<string, ShoppingItem[]>()
    for (const item of data.shopping) {
      const list = map.get(item.category) ?? []
      list.push(item)
      map.set(item.category, list)
    }
    return [...map.entries()]
  }, [data.shopping])

  const done = data.shopping.filter((s) => s.checked).length

  /** Sum the workbook's "45–55" style ranges into a low–high total. */
  const budget = useMemo(() => {
    let low = 0
    let high = 0
    for (const s of data.shopping) {
      if (!s.estCostRm) continue
      const parts = String(s.estCostRm).split(/[–-]/).map((p) => Number.parseFloat(p.trim()))
      if (Number.isFinite(parts[0])) {
        low += parts[0]
        high += Number.isFinite(parts[1]) ? parts[1] : parts[0]
      }
    }
    return { low: Math.round(low), high: Math.round(high) }
  }, [data.shopping])

  if (!ready) return <p className="py-20 text-center text-sm text-faint">Memuatkan…</p>

  return (
    <>
      <BackLink />
      <PageHeader ms="Beli & Prep" en="Shopping, batch prep & vendors" />

      <div className="mb-4 flex gap-1.5">
        {(
          [
            ['list', 'Senarai'],
            ['prep', 'Prep Ahad'],
            ['vendors', 'Kedai'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            className={`tap flex-1 rounded-pill px-3 py-2 text-xs font-semibold ${
              tab === key ? 'bg-salmon text-white' : 'bg-raised text-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'list' && (
        <>
          <Card className="mb-3">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-bold">
                {done} / {data.shopping.length} dibeli
              </p>
              <p className="text-sm font-bold tabular-nums text-salmon">
                RM {budget.low}
                {budget.high !== budget.low && `–${budget.high}`}
              </p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-pill bg-raised">
              <div
                className="h-full bg-avocado transition-[width] duration-500"
                style={{
                  width: `${data.shopping.length ? (done / data.shopping.length) * 100 : 0}%`,
                }}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={addFromPlan}
                className="tap rounded-pill bg-salmon px-3 py-1.5 text-xs font-bold text-white"
              >
                + Dari rancangan minggu
              </button>
              <button
                type="button"
                onClick={reset}
                className="tap rounded-pill bg-raised px-3 py-1.5 text-xs font-semibold text-muted"
              >
                Reset tanda
              </button>
              <button
                type="button"
                onClick={restoreDefaults}
                className="tap rounded-pill px-3 py-1.5 text-xs text-faint"
              >
                Senarai asal
              </button>
            </div>
          </Card>

          <div className="grid gap-3">
            {grouped.map(([category, items]) => (
              <Card key={category}>
                <h2 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-faint">
                  {category}
                </h2>
                <ul className="divide-y divide-line">
                  {items.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => toggle(s.id)}
                        aria-pressed={s.checked}
                        className="tap flex w-full items-center gap-3 py-2 text-left"
                      >
                        <span
                          aria-hidden
                          className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border text-[11px] font-bold ${
                            s.checked
                              ? 'border-avocado bg-avocado text-white'
                              : 'border-line text-transparent'
                          }`}
                        >
                          ✓
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block text-sm ${
                              s.checked ? 'text-faint line-through' : 'font-medium'
                            }`}
                          >
                            {s.item}
                          </span>
                          <span className="block text-xs text-faint">
                            {[s.qty, s.vendor].filter(Boolean).join(' · ')}
                          </span>
                        </span>
                        {s.estCostRm && (
                          <span className="shrink-0 text-xs tabular-nums text-muted">
                            RM{s.estCostRm}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </>
      )}

      {tab === 'prep' && (
        <div className="grid gap-3">
          <Card>
            <h2 className="text-sm font-bold">Protokol Ahad</h2>
            <p className="text-xs text-faint">
              Batch prep pagi Ahad. Kurangkan keputusan harian, naikkan konsistensi.
            </p>
          </Card>
          {PREP.tasks.map((t) => (
            <Card key={t.timeBlock}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-bold tabular-nums text-salmon">{t.timeBlock}</p>
                <p className="text-xs text-faint">{t.duration}</p>
              </div>
              <p className="mt-1 text-sm">{t.task}</p>
              {t.storage && t.storage !== '—' && (
                <p className="mt-1 text-xs text-muted">📦 {t.storage}</p>
              )}
            </Card>
          ))}
          <Card>
            <h2 className="mb-2 text-sm font-bold">Simpanan · Storage</h2>
            <ul className="divide-y divide-line">
              {PREP.storage.map((s) => (
                <li key={s.food} className="py-2">
                  <p className="text-sm font-medium">{s.food}</p>
                  <p className="text-xs text-faint">
                    Peti sejuk {s.fridge} · Freezer {s.freezer}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">{s.reheat}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {tab === 'vendors' && (
        <div className="grid gap-3">
          {VENDORS.map((v) => (
            <Card key={v.name}>
              <p className="text-sm font-bold">{v.name}</p>
              <p className="text-xs text-faint">
                {v.hours} · {v.location}
              </p>
              <p className="mt-1 text-xs text-muted">{v.strengths}</p>
            </Card>
          ))}
        </div>
      )}

      {note && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-24 z-50 animate-slide-up rounded-pill bg-ink px-4 py-3 text-center text-sm font-semibold text-bg shadow-lift"
        >
          {note}
        </div>
      )}
    </>
  )
}
