'use client'

import { useState } from 'react'
import { BackLink } from '@/components/BackLink'
import { Card, PageHeader } from '@/components/ui'
import { METHODOLOGY, TARGET_NOTES } from '@/lib/catalogue'
import { bmr, leanBodyMass, tdee } from '@/lib/nutrition'
import { supabaseClient } from '@/lib/store'
import { defaultData } from '@/lib/store/defaults'
import { useData } from '@/lib/store/provider'
import type { ActivityLevel, Sex, Targets } from '@/lib/types'

const ACTIVITY: { value: ActivityLevel; label: string; factor: string }[] = [
  { value: 'sedentary', label: 'Light', factor: '×1.2' },
  { value: 'moderate', label: 'Moderate', factor: '×1.55' },
  { value: 'active', label: 'Active', factor: '×1.725' },
]

const TARGET_FIELDS: { key: keyof Targets; label: string; unit: string }[] = [
  { key: 'kcal', label: 'Calories', unit: 'kcal' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'carbs', label: 'Carbs', unit: 'g' },
  { key: 'fat', label: 'Fat', unit: 'g' },
  { key: 'fibre', label: 'Fibre', unit: 'g' },
  { key: 'waterMl', label: 'Water', unit: 'ml' },
]

export default function SettingsPage() {
  const { data, ready, update, storeKind } = useData()
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [confirmingReset, setConfirmingReset] = useState(false)

  if (!ready) return <p className="py-20 text-center text-sm text-faint">Loading…</p>

  const p = data.profile
  const basal = p.heightCm && p.age ? bmr(p.startWeightKg, p.heightCm, p.age, p.sex) : null
  const maintenance = basal ? tdee(basal, p.activityLevel) : null
  const lbm = p.bodyFatPct ? leanBodyMass(p.startWeightKg, p.bodyFatPct) : null

  const setProfile = (patch: Partial<typeof p>) =>
    update((d) => ({ ...d, profile: { ...d.profile, ...patch } }))

  const setTarget = (key: keyof Targets, value: number) =>
    update((d) => ({ ...d, targets: { ...d.targets, [key]: value } }))

  /** Wipes food logs, weights, water and ticks, back to a fresh install. */
  const resetEverything = () => {
    update(() => defaultData())
    setConfirmingReset(false)
  }

  return (
    <>
      <BackLink />
      <PageHeader title="Settings" subtitle="Profile, targets & data" />

      <Card className="mb-4">
        <h2 className="mb-3 text-sm font-bold">Profile</h2>
        <div className="grid grid-cols-2 gap-3">
          <NumField
            label="Starting weight (kg)"
            value={p.startWeightKg}
            step={0.1}
            onChange={(v) => v !== null && setProfile({ startWeightKg: v })}
          />
          <NumField
            label="Goal weight (kg)"
            value={p.goalWeightKg}
            step={0.1}
            onChange={(v) => v !== null && setProfile({ goalWeightKg: v })}
          />
          <NumField
            label="Height (cm)"
            value={p.heightCm}
            onChange={(v) => setProfile({ heightCm: v })}
          />
          <NumField label="Age" value={p.age} onChange={(v) => setProfile({ age: v })} />
          <NumField
            label="Body fat (%)"
            value={p.bodyFatPct}
            step={0.1}
            onChange={(v) => setProfile({ bodyFatPct: v })}
          />
          <div>
            <span className="mb-1 block text-xs font-semibold">Sex</span>
            <div className="flex gap-1">
              {(['female', 'male'] as Sex[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setProfile({ sex: s })}
                  aria-pressed={p.sex === s}
                  className={`tap flex-1 rounded-pill px-2 py-2 text-xs font-semibold ${
                    p.sex === s ? 'bg-primary text-white' : 'bg-raised text-muted'
                  }`}
                >
                  {s === 'female' ? 'Female' : 'Male'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3">
          <span className="mb-1 block text-xs font-semibold">
            Activity level
          </span>
          <div className="flex gap-1">
            {ACTIVITY.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => setProfile({ activityLevel: a.value })}
                aria-pressed={p.activityLevel === a.value}
                className={`tap flex-1 rounded-pill px-2 py-2 text-[11px] font-semibold ${
                  p.activityLevel === a.value ? 'bg-primary text-white' : 'bg-raised text-muted'
                }`}
              >
                {a.label}
                <span className="block text-[9px] font-normal opacity-70">{a.factor}</span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="mb-4">
        <h2 className="mb-2 text-sm font-bold">Calculated</h2>
        {basal === null ? (
          <p className="text-xs text-faint">Fill in height and age to calculate BMR &amp; TDEE.</p>
        ) : (
          <dl className="grid grid-cols-3 gap-2 text-center">
            <Calc label="BMR" value={`${basal}`} unit="kcal" />
            <Calc label="TDEE" value={`${maintenance}`} unit="kcal" />
            <Calc label="LBM" value={lbm === null ? '—' : `${lbm}`} unit="kg" />
          </dl>
        )}
        <p className="mt-2 text-[11px] leading-snug text-faint">
          Mifflin–St Jeor. TDEE = BMR × activity factor. A 300–500 kcal daily deficit gives
          roughly 0.4–0.6 kg of loss per week.
        </p>
      </Card>

      <Card className="mb-4">
        <h2 className="mb-3 text-sm font-bold">Daily targets</h2>
        <div className="grid gap-3">
          {TARGET_FIELDS.map((f) => (
            <div key={f.key}>
              <NumField
                label={`${f.label} (${f.unit})`}
                value={data.targets[f.key]}
                onChange={(v) => setTarget(f.key, v ?? 0)}
              />
              {TARGET_NOTES[f.key] && (
                <p className="mt-1 text-[11px] leading-snug text-faint">{TARGET_NOTES[f.key]}</p>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="mb-4">
        <h2 className="text-sm font-bold">Data</h2>
        <p className="mt-1 text-xs text-muted">
          {storeKind === 'supabase'
            ? 'Saved to your account and synced across devices.'
            : 'Saved in this browser only. Connect Supabase to sync across devices.'}
        </p>
        {storeKind === 'supabase' && (
          <button
            type="button"
            onClick={() => supabaseClient()?.auth.signOut()}
            className="tap mt-3 w-full rounded-pill border border-line py-2 text-xs font-semibold text-muted"
          >
            Sign out
          </button>
        )}
      </Card>

      <Card className="mb-4 border-clay/40">
        <h2 className="text-sm font-bold">Reset</h2>
        <p className="mt-1 text-xs text-muted">
          Erases every food log, weight entry, water count and tick, and restores the original
          targets and shopping list. This cannot be undone.
        </p>
        {confirmingReset ? (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={resetEverything}
              className="tap flex-1 rounded-pill bg-clay py-2.5 text-xs font-bold text-white"
            >
              Yes, erase everything
            </button>
            <button
              type="button"
              onClick={() => setConfirmingReset(false)}
              className="tap rounded-pill bg-raised px-4 py-2.5 text-xs font-semibold text-muted"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingReset(true)}
            className="tap mt-3 w-full rounded-pill border border-clay py-2.5 text-xs font-bold text-clay"
          >
            Reset all data
          </button>
        )}
      </Card>

      <Card>
        <button
          type="button"
          onClick={() => setShowDisclaimer((s) => !s)}
          aria-expanded={showDisclaimer}
          className="tap flex w-full items-center justify-between text-left"
        >
          <span className="text-sm font-bold">Medical disclaimer</span>
          <span aria-hidden className="text-faint">
            {showDisclaimer ? '▲' : '▼'}
          </span>
        </button>
        {showDisclaimer && (
          <div className="mt-3 grid gap-2 border-t border-line pt-3">
            {METHODOLOGY.disclaimer.map((para) => (
              <p key={para} className="text-xs leading-relaxed text-muted">
                {para}
              </p>
            ))}
          </div>
        )}
      </Card>
    </>
  )
}

function Calc({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div>
      <dd className="text-xl font-extrabold tabular-nums text-primary">
        {value}
        <span className="ml-0.5 text-[10px] font-semibold text-faint">{unit}</span>
      </dd>
      <dt className="text-[11px] font-semibold">{label}</dt>
    </div>
  )
}

function NumField({
  label,
  value,
  step = 1,
  onChange,
}: {
  label: string
  value: number | null
  step?: number
  onChange: (v: number | null) => void
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        value={value ?? ''}
        onChange={(e) => {
          const v = Number.parseFloat(e.target.value)
          onChange(Number.isFinite(v) ? v : null)
        }}
        className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-base tabular-nums outline-none focus:border-primary"
      />
    </label>
  )
}
