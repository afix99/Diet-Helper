'use client'

import { Emoji } from './Emoji'
import { BURST_STYLES, FALLBACK } from '@/lib/burstPalette'
import { macroSplit } from '@/lib/nutrition'
import type { Food } from '@/lib/types'

/**
 * One food, as a row you can read rather than a spreadsheet cell.
 *
 * The list this replaces printed a name, a serving and then `P 12g C 48g F 15g
 * Fibre 3g` — four labels and four numbers, all the same size, all the same
 * grey. Comparing two foods meant reading eight values and holding them in your
 * head, on the one screen whose entire purpose is comparing foods.
 *
 * Three things carry the redesign:
 *
 * - **The app's own macro colours.** Protein pink, carbs amber, fat blue, fibre
 *   green — the same four Today's macro bars and the Progress charts already
 *   use. This screen was the only place that knew about macros and refused to
 *   colour them.
 * - **A composition bar**, so the shape of a food registers before you read a
 *   single digit. `macroSplit` divides by *energy*, not grams — see the note on
 *   it in nutrition.ts for why a gram-based bar would flatter every fatty food.
 * - **A category mark**, from the colour and shape `burstPalette.ts` already
 *   assigns each category for the confetti. That data was drawn once when you
 *   logged something and never seen again; now the row wears it, and the
 *   confetti afterwards matches the dot you tapped.
 */

/** The three that make up the bar. Fibre lives inside carbs and has no slice. */
const SEGMENTS = [
  { key: 'protein', className: 'bg-primary' },
  { key: 'carbs', className: 'bg-amber' },
  { key: 'fat', className: 'bg-ocean' },
] as const

/**
 * The category's mark: its burst colour, in its burst shape.
 *
 * Six shapes at 10px, drawn small enough that the silhouette is all that
 * survives — which is the point. It is a colour cue first and a shape cue
 * second, and together they are enough to tell a coffee row from a fruit row
 * in peripheral vision.
 */
function CategoryMark({ category }: { category: string }) {
  const style = BURST_STYLES[category] ?? FALLBACK
  const [fill] = style.colours
  const common = { fill, stroke: 'none' }
  return (
    <svg
      aria-hidden
      width="10"
      height="10"
      viewBox="0 0 10 10"
      className="mt-1.5 shrink-0"
      style={{ overflow: 'visible' }}
    >
      {style.shape === 'ring' ? (
        <circle cx="5" cy="5" r="3.6" fill="none" stroke={fill} strokeWidth="2" />
      ) : style.shape === 'leaf' ? (
        <path d="M5 0.6c3.2 1.8 4.4 5.6 0 8.8C0.6 6.2 1.8 2.4 5 0.6Z" {...common} />
      ) : style.shape === 'droplet' ? (
        <path d="M5 0.4c2.6 3 3.9 4.6 3.9 6.1a3.9 3.9 0 1 1-7.8 0C1.1 5 2.4 3.4 5 0.4Z" {...common} />
      ) : style.shape === 'crumb' ? (
        <rect x="1" y="1.6" width="8" height="6.8" rx="2.2" {...common} />
      ) : style.shape === 'spark' ? (
        <path d="M5 0 6.3 3.7 10 5 6.3 6.3 5 10 3.7 6.3 0 5 3.7 3.7Z" {...common} />
      ) : (
        <circle cx="5" cy="5" r="4" {...common} />
      )}
    </svg>
  )
}

export function FoodRow({
  food,
  open,
  favourite,
  confirmingDelete,
  onToggle,
  onFavourite,
  onAskDelete,
  onCancelDelete,
  onDelete,
}: {
  food: Food
  open: boolean
  favourite: boolean
  confirmingDelete: boolean
  onToggle: () => void
  onFavourite: () => void
  onAskDelete: () => void
  onCancelDelete: () => void
  onDelete: () => void
}) {
  // Only foods you added can be removed; the workbook catalogue is fixed.
  const isCustom = food.ownerId !== null
  const split = macroSplit(food)
  const hasMacros = split.protein + split.carbs + split.fat > 0

  return (
    <div className="border-b border-line last:border-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="tap flex w-full items-start gap-2.5 px-3.5 py-3 text-left"
      >
        <CategoryMark category={food.category} />

        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="min-w-0 flex-1 text-secondary font-semibold">
              {food.name}
              {/* Saved state rides on the name rather than owning a 48px column
                  of its own. The old list drew a greyed-out star on all 441
                  rows for a state that is almost always off. */}
              {favourite && (
                <Emoji name="star" size={13} className="ml-1.5 inline-block align-[-1px]" />
              )}
            </span>
            <span className="shrink-0 text-secondary font-bold tabular-nums text-primary-ink">
              {food.kcal}
              <span className="ml-0.5 text-caption font-semibold text-faint">kcal</span>
            </span>
          </span>

          <span className="mt-0.5 block truncate text-caption text-faint">
            {food.servingSize}
            {food.source === 'community' && <span className="ml-1.5">&middot; estimate</span>}
          </span>

          {hasMacros && (
            <>
              <span className="mt-2 flex h-1.5 overflow-hidden rounded-pill bg-raised">
                {SEGMENTS.map((s) => (
                  <span
                    key={s.key}
                    className={s.className}
                    style={{ width: `${split[s.key] * 100}%` }}
                  />
                ))}
              </span>
              {/*
                Values in the same order as the bar above them, each in its
                own colour, so the number and the slice are obviously the same
                thing. The raw tones are used, not ink variants: measured
                against a card they clear 5:1 in light and 7:1 in dark, and
                check-contrast.mjs now guards all three — it previously only
                checked white text *on* these colours, never these colours as
                text, which is why the pairing went unexamined for so long.
              */}
              <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-caption tabular-nums">
                <Macro value={food.protein} label="protein" className="text-primary-ink" />
                <Macro value={food.carbs} label="carbs" className="text-amber" />
                <Macro value={food.fat} label="fat" className="text-ocean" />
                {food.fibre > 0 && (
                  <Macro value={food.fibre} label="fibre" className="text-avocado" />
                )}
              </span>
            </>
          )}
        </span>
      </button>

      {open && (
        <div className="border-t border-line px-3.5 py-2.5">
          {food.source === 'community' && (
            <p className="mb-1.5 text-tertiary leading-relaxed text-faint">
              Estimated from public figures. Chain and street portions vary a lot between
              outlets, so treat this as a good guess rather than a label reading.
            </p>
          )}
          {food.notes && (
            <p className="text-tertiary leading-relaxed text-muted">
              {food.notes}
              {food.glycemicLoad !== null && food.glycemicLoad > 0 && (
                <span className="mt-1 block text-faint">Glycemic load: {food.glycemicLoad}</span>
              )}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onFavourite}
              aria-pressed={favourite}
              className={`tap flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-tertiary font-semibold ${
                favourite ? 'bg-primary/12 text-primary-ink' : 'bg-raised text-muted'
              }`}
            >
              <Emoji name="star" size={13} className={favourite ? '' : 'opacity-40 grayscale'} />
              {favourite ? 'Saved' : 'Save'}
            </button>

            {isCustom &&
              (confirmingDelete ? (
                <>
                  <span className="w-full text-tertiary text-muted">
                    Delete this food? Meals you already logged keep their name.
                  </span>
                  <button
                    type="button"
                    onClick={onDelete}
                    className="tap rounded-pill bg-clay px-3 py-1.5 text-tertiary font-bold text-on-primary"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={onCancelDelete}
                    className="tap rounded-pill px-2 py-1.5 text-tertiary text-faint"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={onAskDelete}
                  className="tap rounded-pill px-3 py-1.5 text-tertiary font-semibold text-clay"
                >
                  Delete
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Macro({
  value,
  label,
  className,
}: {
  value: number
  label: string
  className: string
}) {
  return (
    <span className={className}>
      <b className="font-semibold">{value}</b>
      {/*
        Weight separates the number from its unit, not transparency. The first
        cut faded the suffix to 75%, which reads nicely and measures 3.1:1 on a
        white card — under the 4.5:1 floor, and unreadable for exactly the
        people who need the label most. At full strength every one of these
        four clears 5:1 in light and 7:1 in dark.
      */}
      <span className="ml-0.5 font-normal">g {label}</span>
    </span>
  )
}
