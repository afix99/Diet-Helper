'use client'

import { useId, useState } from 'react'
import { Card, ListGroup, PageHeader, SegmentedControl } from '@/components/ui'
import { Icon } from '@/components/icons'
import { METHODOLOGY, TARGET_NOTES } from '@/lib/catalogue'
import { bmr, leanBodyMass, maintenanceFor } from '@/lib/nutrition'
import {
  PRESETS,
  distributeTargets,
  energyBalance,
  macroKcal,
  reconciles,
  targetRisk,
  type PresetId,
} from '@/lib/targets'
import { supabaseClient } from '@/lib/store'
import { defaultData } from '@/lib/store/defaults'
import { latestWeight } from '@/lib/selectors'
import { ThemeToggle } from '@/components/ThemeToggle'
import { openStarterGuide } from '@/components/OnboardingGate'
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

  if (!ready) return <p className="py-20 text-center text-secondary text-faint">Loading…</p>

  const p = data.profile
  /*
   * Every figure here tracks the body you have now, not the one you started
   * with. Settings used to read from startWeightKg while the macro sheet and
   * the trend card used the latest weigh-in, so the app quoted two different
   * TDEEs on two screens once any weight came off.
   */
  const weighIn = latestWeight(data)
  const weightNow = weighIn && weighIn > 0 ? weighIn : p.startWeightKg
  const basal = p.heightCm && p.age ? bmr(weightNow, p.heightCm, p.age, p.sex) : null
  const maintenance = maintenanceFor(p, weighIn)
  const lbm = p.bodyFatPct ? leanBodyMass(weightNow, p.bodyFatPct) : null

  const setProfile = (patch: Partial<typeof p>) =>
    update((d) => ({ ...d, profile: { ...d.profile, ...patch } }))

  /**
   * Changing calories redistributes every unlocked target. Editing a macro by
   * hand locks it, which is the least surprising reading of the gesture: you
   * typed a number, so it should stay.
   */
  const setTarget = (key: keyof Targets, value: number) =>
    update((d) => {
      if (key === 'kcal') {
        return {
          ...d,
          targets: distributeTargets({
            kcal: value,
            goalWeightKg: d.profile.goalWeightKg,
            bodyWeightKg: d.profile.startWeightKg,
            preset: d.targetPreset,
            locks: d.targetLocks,
            current: d.targets,
          }),
        }
      }
      const locks = { ...d.targetLocks, [key]: true }
      const withEdit = { ...d.targets, [key]: value }
      return {
        ...d,
        targetLocks: locks,
        targets: distributeTargets({
          kcal: withEdit.kcal,
          goalWeightKg: d.profile.goalWeightKg,
            bodyWeightKg: d.profile.startWeightKg,
          preset: d.targetPreset,
          locks,
          current: withEdit,
        }),
      }
    })

  const toggleLock = (key: keyof Targets) =>
    update((d) => {
      const locks = { ...d.targetLocks, [key]: !d.targetLocks[key] }
      return {
        ...d,
        targetLocks: locks,
        targets: distributeTargets({
          kcal: d.targets.kcal,
          goalWeightKg: d.profile.goalWeightKg,
            bodyWeightKg: d.profile.startWeightKg,
          preset: d.targetPreset,
          locks,
          current: d.targets,
        }),
      }
    })

  const applyPreset = (preset: PresetId) =>
    update((d) => ({
      ...d,
      targetPreset: preset,
      // A preset is a deliberate reset of the shape, so it clears hand-set values.
      targetLocks: {},
      targets: distributeTargets({
        kcal: d.targets.kcal,
        goalWeightKg: d.profile.goalWeightKg,
            bodyWeightKg: d.profile.startWeightKg,
        preset,
        current: d.targets,
      }),
    }))

  const recalculate = () =>
    update((d) => ({
      ...d,
      targetLocks: {},
      targets: distributeTargets({
        kcal: d.targets.kcal,
        goalWeightKg: d.profile.goalWeightKg,
            bodyWeightKg: d.profile.startWeightKg,
        preset: d.targetPreset,
        current: d.targets,
      }),
    }))

  const macroTotal = macroKcal(data.targets)
  const balanced = reconciles(data.targets)
  const energy = energyBalance(p, data.targets.kcal, weighIn)
  const risk = targetRisk(p, data.targets.kcal, weighIn)

  /**
   * The workbook's notes were fixed strings, so the calorie one kept claiming a
   * deficit whatever number you typed. These describe the values actually set.
   */
  const noteFor = (key: keyof Targets): string => {
    const t = data.targets
    const w = p.goalWeightKg || 0
    const perKg = (g: number) => (w > 0 ? `${(g / w).toFixed(1)} g/kg of goal weight` : '')
    const share = (g: number, kcalPerG: number) =>
      t.kcal > 0 ? `${Math.round(((g * kcalPerG) / t.kcal) * 100)}% of calories` : ''

    switch (key) {
      case 'kcal':
        if (energy.balance === 'unknown') return 'Add height and age to see how this compares to your TDEE.'
        if (energy.balance === 'maintenance') return `About maintenance — your TDEE is ${energy.tdee} kcal.`
        if (energy.balance === 'surplus')
          return `${energy.diff} kcal above your TDEE of ${energy.tdee} — a surplus, so weight will trend up.`
        {
          const gap = Math.abs(energy.diff ?? 0)
          const perWeek = ((gap * 7) / 7700).toFixed(1)
          // Reporting 1.2 kg a week without comment read as an endorsement.
          const caveat = risk.aggressiveDeficit || risk.belowFloor
            ? ' Most of what comes off at that pace is not fat.'
            : ''
          return `${gap} kcal below your TDEE of ${energy.tdee}. Roughly ${perWeek} kg a week.${caveat}`
        }
      case 'protein':
        return `${perKg(t.protein)} · set by body weight, so it holds steady when calories change.`
      case 'carbs':
        return `${share(t.carbs, 4)} · fills whatever calories protein and fat leave.`
      case 'fat':
        return `${share(t.fat, 9)} · never below 0.8 g/kg, for hormone production.`
      case 'fibre':
        return '14 g per 1000 kcal, the adequate intake figure.'
      case 'waterMl':
        return `35 ml per kg of body weight. ${TARGET_NOTES.waterMl}`
    }
  }

  /** Wipes food logs, weights, water and ticks, back to a fresh install. */
  const resetEverything = () => {
    update(() => defaultData())
    setConfirmingReset(false)
  }

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Profile, targets & data"
        back={{ href: '/more', label: 'More' }}
      />

      <ListGroup
        header="Appearance"
        footer="Dark is not automatically kinder on the eyes. A dark screen widens the pupil, which lets in more optical blur, so bright text on it can look like it is glowing. If reading feels like hard work, try Light."
        className="mb-5"
      >
        <div className="p-4">
          <ThemeToggle />
        </div>
      </ListGroup>

      <ListGroup header="Starter guide" className="mb-5">
        <button
          type="button"
          onClick={openStarterGuide}
          className="tap flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <span>
            <span className="block text-secondary font-semibold">Show the starter guide</span>
            <span className="block text-tertiary text-muted">
              Six cards covering setup and how to log
            </span>
          </span>
          <Icon name="chevron" size={16} strokeWidth={2.25} className="shrink-0 text-faint" />
        </button>
      </ListGroup>

      <ListGroup header="Profile">
        <div className="grid grid-cols-2 gap-3 p-4">
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
            <span className="mb-1 block text-tertiary font-semibold">Sex</span>
            <div className="flex gap-1">
              {(['female', 'male'] as Sex[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setProfile({ sex: s })}
                  aria-pressed={p.sex === s}
                  className={`tap flex-1 rounded-pill px-2 py-2 text-tertiary font-semibold ${
                    p.sex === s ? 'bg-primary text-on-primary' : 'bg-raised text-muted'
                  }`}
                >
                  {s === 'female' ? 'Female' : 'Male'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-4 pb-4">
          <span className="mb-1 block text-tertiary font-semibold">
            Activity level
          </span>
          <div className="flex gap-1">
            {ACTIVITY.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => setProfile({ activityLevel: a.value })}
                aria-pressed={p.activityLevel === a.value}
                className={`tap flex-1 rounded-pill px-2 py-2 text-caption font-semibold ${
                  p.activityLevel === a.value ? 'bg-primary text-on-primary' : 'bg-raised text-muted'
                }`}
              >
                {a.label}
                <span className="block text-caption font-normal opacity-70">{a.factor}</span>
              </button>
            ))}
          </div>
        </div>
      </ListGroup>

      <Card className="mb-5">
        <h2 className="mb-2 text-title">Calculated</h2>
        {basal === null ? (
          <p className="text-tertiary text-faint">Fill in height and age to calculate BMR &amp; TDEE.</p>
        ) : (
          <dl className="grid grid-cols-3 gap-2 text-center">
            <Calc label="BMR" value={`${basal}`} unit="kcal" />
            <Calc label="TDEE" value={`${maintenance}`} unit="kcal" />
            <Calc label="LBM" value={lbm === null ? '—' : `${lbm}`} unit="kg" />
          </dl>
        )}
        <p className="mt-2 text-caption leading-snug text-faint">
          Mifflin–St Jeor. TDEE = BMR × activity factor. A 300–500 kcal daily deficit gives
          roughly 0.4–0.6 kg of loss per week.
        </p>
      </Card>

      <ListGroup header="Daily targets">
        <div className="p-4">
          <SegmentedControl
            label="Macro split"
            value={data.targetPreset}
            onChange={applyPreset}
            options={PRESETS.map((x) => ({ value: x.id, label: x.label }))}
          />
          <p className="-mt-3 mb-4 text-caption leading-snug text-faint">
            {PRESETS.find((x) => x.id === data.targetPreset)?.description}
          </p>

          <div className="grid gap-3">
            {TARGET_FIELDS.map((f) => (
              <div key={f.key}>
                <NumField
                  label={`${f.label} (${f.unit})`}
                  value={data.targets[f.key]}
                  onChange={(v) => setTarget(f.key, v ?? 0)}
                  locked={f.key === 'kcal' ? undefined : Boolean(data.targetLocks[f.key])}
                  onToggleLock={f.key === 'kcal' ? undefined : () => toggleLock(f.key)}
                />
                <p className="mt-1 text-caption leading-snug text-faint">{noteFor(f.key)}</p>
                {f.key === 'kcal' && risk.note && (
                  <div className="mt-2 rounded-inner bg-amber/10 px-3 py-2.5 text-amber">
                    <p className="text-caption leading-relaxed">{risk.note}</p>
                    {risk.belowFloor && (
                      <button
                        type="button"
                        onClick={() => setTarget('kcal', risk.suggestedKcal)}
                        className="tap mt-2 rounded-pill bg-amber px-4 py-1.5 text-caption font-bold text-on-primary"
                      >
                        Use {risk.suggestedKcal.toLocaleString('en-GB')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* The macros must describe the same diet as the calorie goal. Show
              whether they currently do, rather than leaving it to be discovered. */}
          <div
            className={`mt-4 rounded-inner px-3 py-2.5 text-tertiary ${
              balanced ? 'bg-avocado/10 text-avocado' : 'bg-amber/10 text-amber'
            }`}
          >
            <p className="font-semibold">
              P {data.targets.protein}g · C {data.targets.carbs}g · F {data.targets.fat}g ={' '}
              {macroTotal} kcal{' '}
              {balanced && <Icon name="check" size={14} strokeWidth={3} className="inline" />}
            </p>
            {!balanced && (
              <>
                <p className="mt-0.5 leading-snug">
                  These add up to {macroTotal} kcal, not {data.targets.kcal}. Locked values are
                  holding the rest out of balance.
                </p>
                <button
                  type="button"
                  onClick={recalculate}
                  className="tap mt-2 w-full rounded-pill bg-amber py-2 text-tertiary font-bold text-on-primary"
                >
                  Recalculate to match {data.targets.kcal} kcal
                </button>
              </>
            )}
          </div>
        </div>
      </ListGroup>

      <Card className="mb-5">
        <h2 className="text-title">Data</h2>
        <p className="mt-1 text-tertiary text-muted">
          {storeKind === 'supabase'
            ? 'Saved to your account and synced across devices.'
            : 'Saved in this browser only. Connect Supabase to sync across devices.'}
        </p>
        {storeKind === 'supabase' && (
          <button
            type="button"
            onClick={() => supabaseClient()?.auth.signOut()}
            className="tap mt-3 w-full rounded-pill border border-line py-2 text-tertiary font-semibold text-muted"
          >
            Sign out
          </button>
        )}
      </Card>

      <Card className="mb-5 border-clay/40">
        <h2 className="text-title text-clay">Reset</h2>
        <p className="mt-1 text-tertiary text-muted">
          Erases every food log, weight entry, water count and tick, and restores the original
          targets and shopping list. This cannot be undone.
        </p>
        {confirmingReset ? (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={resetEverything}
              className="tap flex-1 rounded-pill bg-clay py-2.5 text-tertiary font-bold text-on-primary"
            >
              Yes, erase everything
            </button>
            <button
              type="button"
              onClick={() => setConfirmingReset(false)}
              className="tap rounded-pill bg-raised px-4 py-2.5 text-tertiary font-semibold text-muted"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingReset(true)}
            className="tap mt-3 w-full rounded-pill border border-clay py-2.5 text-tertiary font-bold text-clay"
          >
            Reset all data
          </button>
        )}
      </Card>

      <Card className="mb-5">
        <h2 className="text-title">Credits</h2>
        <p className="mt-2 text-secondary font-semibold">Afiq Haikal</p>
        <p className="text-tertiary text-muted">Programmer</p>

        {/*
          The Twemoji line is not optional decoration. That artwork is CC-BY 4.0,
          and attribution is the single condition the licence attaches to using
          it. Kept quiet, but kept.
        */}
        <p className="mt-3 border-t border-line pt-3 text-tertiary leading-relaxed text-faint">
          Emoji artwork by{' '}
          <a
            href="https://github.com/jdecked/twemoji"
            target="_blank"
            rel="noreferrer noopener"
            className="font-semibold text-primary-ink underline decoration-primary-ink/30 underline-offset-2"
          >
            Twemoji
          </a>
          , licensed{' '}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noreferrer noopener"
            className="font-semibold text-primary-ink underline decoration-primary-ink/30 underline-offset-2"
          >
            CC-BY 4.0
          </a>
          . Badge medallions drawn for this app.
        </p>
      </Card>

      <Card>
        <button
          type="button"
          onClick={() => setShowDisclaimer((s) => !s)}
          aria-expanded={showDisclaimer}
          className="tap flex w-full items-center justify-between text-left"
        >
          <span className="text-title">Medical disclaimer</span>
          <Icon
            name="chevron"
            size={14}
            strokeWidth={2.5}
            className={`text-faint transition-transform duration-200 ${
              showDisclaimer ? '-rotate-90' : 'rotate-90'
            }`}
          />
        </button>
        {showDisclaimer && (
          <div className="mt-3 grid gap-2 border-t border-line pt-3">
            {METHODOLOGY.disclaimer.map((para) => (
              <p key={para} className="text-tertiary leading-relaxed text-muted">
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
      <dd className="text-xl font-extrabold tabular-nums text-primary-ink">
        {value}
        <span className="ml-0.5 text-caption font-semibold text-faint">{unit}</span>
      </dd>
      <dt className="text-caption font-semibold">{label}</dt>
    </div>
  )
}

function NumField({
  label,
  value,
  step = 1,
  onChange,
  locked,
  onToggleLock,
}: {
  label: string
  value: number | null
  step?: number
  onChange: (v: number | null) => void
  /** Omit for fields that aren't part of the macro distribution. */
  locked?: boolean
  onToggleLock?: () => void
}) {
  const id = useId()
  /*
   * The lock button is a sibling of the input rather than a child of its
   * <label>: nested inside, its text folds into the input's accessible name,
   * which becomes "Protein (g) Auto" for anyone using a screen reader.
   */
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-tertiary font-semibold">
          {label}
        </label>
        {onToggleLock && (
          <button
            type="button"
            onClick={onToggleLock}
            aria-pressed={locked}
            aria-label={`${locked ? 'Unlock' : 'Lock'} ${label}`}
            className={`rounded-pill px-2 py-0.5 text-caption font-semibold ${
              locked ? 'bg-primary/15 text-primary-ink' : 'text-faint'
            }`}
          >
            {locked ? 'Locked' : 'Auto'}
          </button>
        )}
      </div>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step={step}
        value={value ?? ''}
        onChange={(e) => {
          const v = Number.parseFloat(e.target.value)
          onChange(Number.isFinite(v) ? v : null)
        }}
        className="w-full rounded-inner border border-line bg-surface px-3 py-2 text-body tabular-nums outline-none focus:border-primary"
      />
    </div>
  )
}
