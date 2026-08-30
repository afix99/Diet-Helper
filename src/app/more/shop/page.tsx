'use client'

import { useMemo, useState } from 'react'
import { Card, ListGroup, PageHeader, SegmentedControl } from '@/components/ui'
import { Icon } from '@/components/icons'
import { PREP, RECIPES, VENDORS } from '@/lib/catalogue'
import { aggregateIngredients } from '@/lib/ingredients'
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
      setNote('No recipes planned this week yet.')
      setTimeout(() => setNote(null), 2600)
      return
    }
    // Aggregate rather than dedupe: three recipes wanting 150g salmon should
    // produce one 450g line, not three identical ones.
    const raws: string[] = []
    for (const id of planned) {
      const recipe = RECIPES.find((r) => r.id === id)
      if (recipe) raws.push(...recipe.ingredients)
    }
    const wanted = aggregateIngredients(raws)
    update((d) => {
      const existing = new Set(d.shopping.map((s) => s.item.toLowerCase()))
      const added: ShoppingItem[] = wanted
        .filter((w) => !existing.has(w.label.toLowerCase()))
        .map((w, i) => ({
          id: `plan-${Date.now()}-${i}`,
          category: 'FROM YOUR PLAN',
          item: w.label,
          qty: w.count > 1 ? `for ${w.count} recipes` : null,
          estCostRm: null,
          vendor: null,
          priority: 'ESSENTIAL',
          checked: false,
        }))
      if (added.length === 0) {
        setNote('Every ingredient is already on the list.')
        setTimeout(() => setNote(null), 2600)
        return d
      }
      setNote(`Added ${added.length} combined ingredients from your plan.`)
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

  if (!ready) return <p className="py-20 text-center text-secondary text-faint">Loading…</p>

  return (
    <>
      <PageHeader
        title="Shop & Prep"
        subtitle="Shopping, batch prep & vendors"
        back={{ href: '/more', label: 'More' }}
      />

      <SegmentedControl
        label="Shop sections"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'list', label: 'List' },
          { value: 'prep', label: 'Sunday Prep' },
          { value: 'vendors', label: 'Vendors' },
        ]}
      />

      {tab === 'list' && (
        <>
          <Card className="mb-3">
            <div className="flex items-baseline justify-between">
              <p className="text-secondary font-bold">
                {done} of {data.shopping.length} bought
              </p>
              <p className="text-secondary font-bold tabular-nums text-primary-ink">
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
                className="tap rounded-pill bg-primary px-3 py-1.5 text-tertiary font-bold text-on-primary"
              >
                + From this week’s plan
              </button>
              <button
                type="button"
                onClick={reset}
                className="tap rounded-pill bg-raised px-3 py-1.5 text-tertiary font-semibold text-muted"
              >
                Clear ticks
              </button>
              <button
                type="button"
                onClick={restoreDefaults}
                className="tap rounded-pill px-3 py-1.5 text-tertiary text-faint"
              >
                Restore original list
              </button>
            </div>
          </Card>

          <div className="stack gap-3">
            {grouped.map(([category, items]) => (
              <ListGroup key={category} header={category}>
                <ul>
                  {items.map((s) => (
                    <li key={s.id} className="[&+li]:border-t [&+li]:border-line">
                      <button
                        type="button"
                        onClick={() => toggle(s.id)}
                        aria-pressed={s.checked}
                        className="tap-row flex w-full items-center gap-3 px-4 py-2.5 text-left"
                      >
                        <span
                          aria-hidden
                          className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border text-caption font-bold ${
                            s.checked
                              ? 'border-avocado bg-avocado text-on-primary'
                              : 'border-line text-transparent'
                          }`}
                        >
                          {s.checked && <Icon name="check" size={13} strokeWidth={3} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block text-secondary ${
                              s.checked ? 'text-faint line-through' : 'font-medium'
                            }`}
                          >
                            {s.item}
                          </span>
                          <span className="block text-tertiary text-faint">
                            {[s.qty, s.vendor].filter(Boolean).join(' · ')}
                          </span>
                        </span>
                        {s.estCostRm && (
                          <span className="shrink-0 text-tertiary tabular-nums text-muted">
                            RM{s.estCostRm}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </ListGroup>
            ))}
          </div>
        </>
      )}

      {tab === 'prep' && (
        <div>
          <ListGroup
            header="Sunday protocol"
            footer="Batch prep on Sunday morning. Fewer daily decisions, better consistency."
          >
            {PREP.tasks.map((t) => (
              <div key={t.timeBlock} className="px-4 py-2.5 [&+div]:border-t [&+div]:border-line">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-secondary font-bold tabular-nums text-primary-ink">
                    {t.timeBlock}
                  </p>
                  <p className="text-tertiary text-faint">{t.duration}</p>
                </div>
                <p className="mt-0.5 text-body">{t.task}</p>
                {t.storage && t.storage !== '—' && (
                  <p className="mt-0.5 text-tertiary text-muted">{t.storage}</p>
                )}
              </div>
            ))}
          </ListGroup>

          <ListGroup header="Storage">
            {PREP.storage.map((s) => (
              <div key={s.food} className="px-4 py-2.5 [&+div]:border-t [&+div]:border-line">
                <p className="text-body">{s.food}</p>
                <p className="text-tertiary text-faint">
                  Fridge {s.fridge} · Freezer {s.freezer}
                </p>
                <p className="mt-0.5 text-tertiary text-muted">{s.reheat}</p>
              </div>
            ))}
          </ListGroup>
        </div>
      )}

      {tab === 'vendors' && (
        <ListGroup header="Setiawangsa area">
          {VENDORS.map((v) => (
            <div key={v.name} className="px-4 py-2.5 [&+div]:border-t [&+div]:border-line">
              <p className="text-body">{v.name}</p>
              <p className="text-tertiary text-faint">
                {v.hours} · {v.location}
              </p>
              <p className="mt-0.5 text-tertiary text-muted">{v.strengths}</p>
            </div>
          ))}
        </ListGroup>
      )}

      {note && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-24 z-50 animate-slide-up rounded-pill bg-ink px-4 py-3 text-center text-secondary font-semibold text-bg shadow-lift"
        >
          {note}
        </div>
      )}
    </>
  )
}
