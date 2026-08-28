/**
 * Combine recipe ingredients into one shopping line per item.
 *
 * Whisk's best trick is that adding three recipes doesn't give you three
 * "salmon fillet" lines — it gives you one that knows you need 450g. Doing that
 * needs the quantity parsed out of the free text the workbook stores, which
 * looks like "150g salmon fillet", "1 tbsp sambal tumis", "2 cloves garlic".
 */

export interface ParsedIngredient {
  /** Numeric amount, when one was stated. */
  quantity: number | null
  /** Unit as written, lower-cased and singularised where obvious. */
  unit: string | null
  /** The item itself, with quantity, unit and preparation notes removed. */
  name: string
  /** The original text, kept so nothing is silently lost. */
  raw: string
}

export interface AggregatedIngredient {
  name: string
  /** One entry per distinct unit — you can't add 150g to 2 cloves. */
  amounts: { quantity: number; unit: string | null }[]
  /** How many recipes asked for it. */
  count: number
  /** Display line, e.g. "450g salmon fillet" or "garlic (3 recipes)". */
  label: string
}

const UNICODE_FRACTIONS: Record<string, number> = {
  '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75, '⅛': 0.125,
}

const UNIT_ALIASES: Record<string, string> = {
  grams: 'g', gram: 'g', gs: 'g', g: 'g',
  kilograms: 'kg', kilogram: 'kg', kg: 'kg',
  millilitres: 'ml', milliliters: 'ml', ml: 'ml',
  litres: 'l', liters: 'l', l: 'l',
  tablespoons: 'tbsp', tablespoon: 'tbsp', tbsp: 'tbsp',
  teaspoons: 'tsp', teaspoon: 'tsp', tsp: 'tsp',
  cups: 'cup', cup: 'cup',
  cloves: 'clove', clove: 'clove',
  stalks: 'stalk', stalk: 'stalk',
  slices: 'slice', slice: 'slice',
  pieces: 'piece', piece: 'piece', pcs: 'piece', pc: 'piece',
  tins: 'tin', tin: 'tin', cans: 'tin', can: 'tin',
  sprigs: 'sprig', sprig: 'sprig',
}

/** Preparation notes are not part of the thing you buy. */
const PREP_WORDS = /\b(minced|sliced|julienned|chopped|diced|drained|flaked|grated|crushed|quartered|beaten|cold|day-old|fresh|optional|to taste|served|raw|cooked)\b/g

function parseAmount(token: string): number | null {
  if (token in UNICODE_FRACTIONS) return UNICODE_FRACTIONS[token]
  // "1½"
  const mixed = token.match(/^(\d+)([½⅓⅔¼¾⅛])$/)
  if (mixed) return Number(mixed[1]) + UNICODE_FRACTIONS[mixed[2]]
  // "1/2"
  const frac = token.match(/^(\d+)\/(\d+)$/)
  if (frac) return Number(frac[1]) / Number(frac[2])
  const n = Number.parseFloat(token)
  return Number.isFinite(n) ? n : null
}

export function parseIngredient(raw: string): ParsedIngredient {
  const text = raw.trim()
  // Drop anything parenthesised — it's a note, not a quantity to buy.
  let rest = text.replace(/\([^)]*\)/g, ' ')
  let quantity: number | null = null
  let unit: string | null = null

  // "150g", "2cm", "1.5kg" — number glued to its unit.
  const glued = rest.match(/^\s*([\d.]+|[½⅓⅔¼¾⅛]|\d+[½⅓⅔¼¾⅛])\s*([a-z]+)\b/i)
  if (glued && parseAmount(glued[1]) !== null && UNIT_ALIASES[glued[2].toLowerCase()]) {
    quantity = parseAmount(glued[1])
    unit = UNIT_ALIASES[glued[2].toLowerCase()]
    rest = rest.slice(glued[0].length)
  } else {
    const words = rest.trim().split(/\s+/)
    const amount = parseAmount(words[0] ?? '')
    if (amount !== null) {
      quantity = amount
      const maybeUnit = UNIT_ALIASES[(words[1] ?? '').toLowerCase().replace(/[^a-z]/g, '')]
      if (maybeUnit) {
        unit = maybeUnit
        rest = words.slice(2).join(' ')
      } else {
        rest = words.slice(1).join(' ')
      }
    }
  }

  const name = rest
    .toLowerCase()
    .replace(PREP_WORDS, ' ')
    .replace(/[^a-z0-9\s&'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,-]+|[\s,-]+$/g, '')
    .trim()

  return { quantity, unit, name: name || text.toLowerCase().trim(), raw: text }
}

const formatAmount = (n: number) => {
  const rounded = Math.round(n * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}

/** Title Case for display, leaving short joining words alone. */
const titleCase = (s: string) =>
  s.replace(/\b[a-z]/g, (c) => c.toUpperCase()).replace(/\b(And|Or|Of|With)\b/g, (m) => m.toLowerCase())

/**
 * Merge a flat list of ingredient strings into one line per item, summing
 * amounts that share a unit and keeping incompatible units side by side.
 */
export function aggregateIngredients(raws: readonly string[]): AggregatedIngredient[] {
  const byName = new Map<string, AggregatedIngredient>()

  for (const raw of raws) {
    const parsed = parseIngredient(raw)
    if (!parsed.name) continue

    const existing = byName.get(parsed.name)
    const entry: AggregatedIngredient =
      existing ?? { name: parsed.name, amounts: [], count: 0, label: '' }

    entry.count += 1
    if (parsed.quantity !== null) {
      const slot = entry.amounts.find((a) => a.unit === parsed.unit)
      // Only quantities in the same unit can be added together.
      if (slot) slot.quantity += parsed.quantity
      else entry.amounts.push({ quantity: parsed.quantity, unit: parsed.unit })
    }
    byName.set(parsed.name, entry)
  }

  for (const entry of byName.values()) {
    const parts = entry.amounts.map((a) =>
      a.unit === 'g' || a.unit === 'kg' || a.unit === 'ml' || a.unit === 'l'
        ? `${formatAmount(a.quantity)}${a.unit}`
        : a.unit
          ? `${formatAmount(a.quantity)} ${a.unit}${a.quantity === 1 ? '' : 's'}`
          : `${formatAmount(a.quantity)}`
    )
    const amount = parts.join(' + ')
    const name = titleCase(entry.name)
    entry.label = amount ? `${amount} ${name}` : name
    if (!amount && entry.count > 1) entry.label = `${name} (${entry.count} recipes)`
  }

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name))
}
