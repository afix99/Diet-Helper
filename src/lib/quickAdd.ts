/**
 * Natural-language meal logging: "2 eggs, a cup of brown rice and teh tarik"
 * becomes three matched entries.
 *
 * Appediet's version calls out to an AI. This one is a parser, which for a
 * fixed 69-item catalogue is both good enough and better behaved: it works
 * offline, costs nothing, returns instantly, and never invents a food that
 * isn't in the database.
 */
import type { Food } from './types'

export interface QuickAddMatch {
  /** The fragment of input this came from, so the UI can show what it read. */
  phrase: string
  food: Food
  servings: number
  /** 0–1. Low scores are shown but flagged, never silently logged. */
  confidence: number
}

export interface QuickAddResult {
  matches: QuickAddMatch[]
  /** Fragments nothing matched, so the UI can offer to add them as new foods. */
  unmatched: string[]
}

const NUMBER_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  half: 0.5,
  quarter: 0.25,
  couple: 2,
  double: 2,
}

/** Words that carry no matching signal and would otherwise skew the score. */
const NOISE = new Set([
  'of', 'a', 'an', 'the', 'and', 'with', 'some', 'plus', 'my', 'i', 'had', 'ate',
  'on', 'in', 'at', 'for', 'to', 'it', 'was', 'were', 'just', 'also', 'then',
  'plate', 'bowl', 'cup', 'cups', 'glass', 'piece', 'pieces', 'slice', 'slices',
  'serving', 'servings', 'portion', 'portions', 'tin', 'can', 'scoop', 'stick',
  'g', 'gram', 'grams', 'kg', 'ml', 'tbsp', 'tsp', 'x',
])

/**
 * Leading words people open with that aren't part of any food name. Stripped
 * before the quantity is read, so "I ate two thosai" still yields two.
 * Deliberately excludes "a"/"an", which *are* quantities.
 */
const LEAD_FILLER = new Set([
  'i', 'we', 'ate', 'eat', 'eaten', 'had', 'have', 'having', 'took', 'just',
  'also', 'then', 'my', 'today', 'breakfast', 'lunch', 'dinner', 'snack', 'was',
])

function stripLeadFiller(phrase: string): string {
  const words = normalise(phrase).split(' ')
  let i = 0
  while (i < words.length && LEAD_FILLER.has(words[i])) i += 1
  return words.slice(i).join(' ')
}

const normalise = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Split on commas, "and", "with", "+", newlines — the ways people list things.
 * "with" counts: in a food log "salmon with broccoli" is two items, not one.
 */
export function splitPhrases(input: string): string[] {
  return input
    .split(/[,\n;]+|\s+(?:and|plus|with)\s+|\s*\+\s*/i)
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * Pull a leading quantity off a phrase. "2 eggs" → 2, "a cup of rice" → 1,
 * "150g salmon" → 1 (a gram count is a portion size, not a serving count, and
 * the catalogue is already per-serving).
 */
export function extractQuantity(phrase: string): { servings: number; rest: string } {
  const words = stripLeadFiller(phrase).split(' ').filter(Boolean)
  if (words.length === 0) return { servings: 1, rest: phrase }

  const first = words[0]

  // "150g" or "150" followed by a mass unit is a weight, not a count.
  const massMatch = first.match(/^(\d+(?:\.\d+)?)(g|kg|ml|l)$/)
  if (massMatch) return { servings: 1, rest: words.slice(1).join(' ') }
  if (/^\d+(?:\.\d+)?$/.test(first) && /^(g|kg|ml|l)$/.test(words[1] ?? '')) {
    return { servings: 1, rest: words.slice(2).join(' ') }
  }

  // "2", "2x", "1.5"
  const numMatch = first.match(/^(\d+(?:\.\d+)?)x?$/)
  if (numMatch) {
    return { servings: Number.parseFloat(numMatch[1]), rest: words.slice(1).join(' ') }
  }

  if (first in NUMBER_WORDS) {
    return { servings: NUMBER_WORDS[first], rest: words.slice(1).join(' ') }
  }

  return { servings: 1, rest: words.join(' ') }
}

const tokens = (s: string) =>
  normalise(s)
    .split(' ')
    .filter((t) => t.length > 1 && !NOISE.has(t))

/**
 * Words describing how a food was cooked rather than what it is.
 *
 * These carry far less information about which food is meant: "grilled" fits
 * salmon, chicken, bacon and half the catalogue, while "salmon" fits one thing.
 * Weighting them equally let "grilled salmon" match "Bacon, grilled" once bacon
 * existed, purely because that name is shorter. They should refine a choice,
 * not drive it.
 */
const PREPARATION = new Set([
  'grilled', 'fried', 'steamed', 'boiled', 'baked', 'roasted', 'raw', 'cooked',
  'boil', 'roast', 'stir', 'boiling', 'plain', 'standard', 'fresh', 'dried',
  'canned', 'sliced', 'chopped', 'whole', 'hot', 'cold', 'iced', 'mixed',
])

/**
 * Score a food against a phrase. Rewards covering the phrase's words, and
 * gently prefers shorter names so "Banana" beats "Banana Bread" for "banana".
 */
export function scoreFood(phraseTokens: string[], food: Food): number {
  if (phraseTokens.length === 0) return 0
  const nameTokens = tokens(food.name)
  if (nameTokens.length === 0) return 0

  let hits = 0
  let weightTotal = 0
  let nounHit = false
  for (const pt of phraseTokens) {
    const weight = PREPARATION.has(pt) ? 0.25 : 1
    weightTotal += weight
    const exact = nameTokens.some((nt) => nt === pt)
    // Singular/plural and stems: "eggs" vs "egg", "tomatoes" vs "tomato".
    const loose =
      !exact &&
      nameTokens.some(
        (nt) => nt.startsWith(pt) || pt.startsWith(nt) || `${nt}s` === pt || `${pt}s` === nt
      )
    if (exact) hits += weight
    else if (loose) hits += weight * 0.75
    if ((exact || loose) && weight === 1) nounHit = true
  }
  if (hits === 0) return 0
  /*
   * Something must match on the food itself, not only on how it was cooked.
   * Without this, "grilled salmon" settles for anything grilled when no salmon
   * is found — and "grilled" on its own picks a food at random, which is the
   * guessing this parser exists to refuse.
   */
  if (!nounHit) return 0

  const coverage = hits / weightTotal
  // Penalise names carrying many words the phrase never mentioned.
  const extra = Math.max(0, nameTokens.length - phraseTokens.length)
  const brevity = 1 / (1 + extra * 0.18)
  return coverage * brevity
}

const MIN_CONFIDENCE = 0.34

/** Parse a sentence into logged-food candidates. Pure and synchronous. */
export function parseQuickAdd(input: string, foods: readonly Food[]): QuickAddResult {
  const matches: QuickAddMatch[] = []
  const unmatched: string[] = []

  for (const phrase of splitPhrases(input)) {
    const { servings, rest } = extractQuantity(phrase)
    const pt = tokens(rest)
    if (pt.length === 0) continue

    let best: Food | null = null
    let bestScore = 0
    for (const food of foods) {
      const score = scoreFood(pt, food)
      if (score > bestScore) {
        bestScore = score
        best = food
      }
    }

    if (best && bestScore >= MIN_CONFIDENCE) {
      matches.push({
        phrase: phrase.trim(),
        food: best,
        servings,
        confidence: Math.min(1, bestScore),
      })
    } else {
      unmatched.push(phrase.trim())
    }
  }

  return { matches, unmatched }
}
