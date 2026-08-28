'use client'

import { useState } from 'react'
import { BackLink } from '@/components/BackLink'
import { Card, PageHeader } from '@/components/ui'
import { METHODOLOGY, TARGET_NOTES } from '@/lib/catalogue'
import { bmr, leanBodyMass, tdee } from '@/lib/nutrition'
import { supabaseClient } from '@/lib/store'
import { useData } from '@/lib/store/provider'
import type { ActivityLevel, Sex, Targets } from '@/lib/types'

const ACTIVITY: { value: ActivityLevel; ms: string; factor: string }[] = [
  { value: 'sedentary', ms: 'Kurang aktif', factor: '×1.2' },
  { value: 'moderate', ms: 'Sederhana', factor: '×1.55' },
  { value: 'active', ms: 'Aktif', factor: '×1.725' },
]

const TARGET_FIELDS: { key: keyof Targets; ms: string; en: string; unit: string }[] = [
  { key: 'kcal', ms: 'Tenaga', en: 'Energy', unit: 'kcal' },
  { key: 'protein', ms: 'Protein', en: 'Protein', unit: 'g' },
  { key: 'carbs', ms: 'Karbohidrat', en: 'Carbs', unit: 'g' },
  { key: 'fat', ms: 'Lemak', en: 'Fat', unit: 'g' },
  { key: 'fibre', ms: 'Serat', en: 'Fibre', unit: 'g' },
  { key: 'waterMl', ms: 'Air', en: 'Water', unit: 'ml' },
]

export default function SettingsPage() {
  const { data, ready, update, storeKind } = useData()
  const [showDisclaimer, setShowDisclaimer] = useState(false)

  if (!ready) return <p className="py-20 text-center text-sm text-faint">Memuatkan…</p>

  const p = data.profile
  const basal = p.heightCm && p.age ? bmr(p.startWeightKg, p.heightCm, p.age, p.sex) : null
  const maintenance = basal ? tdee(basal, p.activityLevel) : null
  const lbm = p.bodyFatPct ? leanBodyMass(p.startWeightKg, p.bodyFatPct) : null

  const setProfile = (patch: Partial<typeof p>) =>
    update((d) => ({ ...d, profile: { ...d.profile, ...patch } }))

  const setTarget = (key: keyof Targets, value: number) =>
    update((d) => ({ ...d, targets: { ...d.targets, [key]: value } }))

  return (
    <>
      <BackLink />
      <PageHeader ms="Tetapan" en="Profile & targets" />

      <Card className="mb-4">
        <h2 className="mb-3 text-sm font-bold">
          Profil <span className="font-normal text-faint">Profile</span>
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <NumField
            label="Berat mula"
            en="Start (kg)"
            value={p.startWeightKg}
            step={0.1}
            onChange={(v) => v !== null && setProfile({ startWeightKg: v })}
          />
          <NumField
            label="Berat sasaran"
            en="Goal (kg)"
            value={p.goalWeightKg}
            step={0.1}
            onChange={(v) => v !== null && setProfile({ goalWeightKg: v })}
          />
          <NumField
            label="Tinggi"
            en="Height (cm)"
            value={p.heightCm}
            onChange={(v) => setProfile({ heightCm: v })}
          />
          <NumField label="Umur" en="Age" value={p.age} onChange={(v) => setProfile({ age: v })} />
          <NumField
            label="Lemak badan"
            en="Body fat (%)"
            value={p.bodyFatPct}
            step={0.1}
            onChange={(v) => setProfile({ bodyFatPct: v })}
          />
          <div>
            <span className="mb-1 block text-xs font-semibold">
              Jantina <span className="font-normal text-faint">Sex</span>
            </span>
            <div className="flex gap-1">
              {(['female', 'male'] as Sex[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setProfile({ sex: s })}
                  aria-pressed={p.sex === s}
                  className={`tap flex-1 rounded-pill px-2 py-2 text-xs font-semibold ${
                    p.sex === s ? 'bg-salmon text-white' : 'bg-raised text-muted'
                  }`}
                >
                  {s === 'female' ? 'Perempuan' : 'Lelaki'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3">
          <span className="mb-1 block text-xs font-semibold">
            Tahap aktiviti <span className="font-normal text-faint">Activity</span>
          </span>
          <div className="flex gap-1">
            {ACTIVITY.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => setProfile({ activityLevel: a.value })}
                aria-pressed={p.activityLevel === a.value}
                className={`tap flex-1 rounded-pill px-2 py-2 text-[11px] font-semibold ${
                  p.activityLevel === a.value ? 'bg-salmon text-white' : 'bg-raised text-muted'
                }`}
              >
                {a.ms}
                <span className="block text-[9px] font-normal opacity-70">{a.factor}</span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="mb-4">
        <h2 className="mb-2 text-sm font-bold">
          Kiraan <span className="font-normal text-faint">Calculated</span>
        </h2>
        {basal === null ? (
          <p className="text-xs text-faint">Isi tinggi dan umur untuk kira BMR &amp; TDEE.</p>
        ) : (
          <dl className="grid grid-cols-3 gap-2 text-center">
            <Calc label="BMR" value={`${basal}`} unit="kcal" />
            <Calc label="TDEE" value={`${maintenance}`} unit="kcal" />
            <Calc label="LBM" value={lbm === null ? '—' : `${lbm}`} unit="kg" />
          </dl>
        )}
        <p className="mt-2 text-[11px] leading-snug text-faint">
          Mifflin–St Jeor. TDEE = BMR × faktor aktiviti. Defisit 300–500 kcal sehari beri
          penurunan ~0.4–0.6 kg seminggu.
        </p>
      </Card>

      <Card className="mb-4">
        <h2 className="mb-3 text-sm font-bold">
          Sasaran harian <span className="font-normal text-faint">Daily targets</span>
        </h2>
        <div className="grid gap-3">
          {TARGET_FIELDS.map((f) => (
            <div key={f.key}>
              <NumField
                label={f.ms}
                en={`${f.en} (${f.unit})`}
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
        <h2 className="text-sm font-bold">
          Data <span className="font-normal text-faint">Storage</span>
        </h2>
        <p className="mt-1 text-xs text-muted">
          {storeKind === 'supabase'
            ? 'Disimpan dalam akaun anda — sync merentas peranti.'
            : 'Disimpan dalam pelayar ini sahaja. Sambungkan Supabase untuk sync merentas peranti.'}
        </p>
        {storeKind === 'supabase' && (
          <button
            type="button"
            onClick={() => supabaseClient()?.auth.signOut()}
            className="tap mt-3 w-full rounded-pill border border-line py-2 text-xs font-semibold text-muted"
          >
            Log keluar
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
          <span className="text-sm font-bold">
            Penafian perubatan <span className="font-normal text-faint">Medical disclaimer</span>
          </span>
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
      <dd className="text-xl font-extrabold tabular-nums text-salmon">
        {value}
        <span className="ml-0.5 text-[10px] font-semibold text-faint">{unit}</span>
      </dd>
      <dt className="text-[11px] font-semibold">{label}</dt>
    </div>
  )
}

function NumField({
  label,
  en,
  value,
  step = 1,
  onChange,
}: {
  label: string
  en: string
  value: number | null
  step?: number
  onChange: (v: number | null) => void
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold">
        {label} <span className="font-normal text-faint">{en}</span>
      </span>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        value={value ?? ''}
        onChange={(e) => {
          const v = Number.parseFloat(e.target.value)
          onChange(Number.isFinite(v) ? v : null)
        }}
        className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-base tabular-nums outline-none focus:border-salmon"
      />
    </label>
  )
}
