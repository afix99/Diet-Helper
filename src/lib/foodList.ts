/**
 * How the Foods screen arranges 441 rows.
 *
 * Two jobs, both pure so they can be tested without a renderer, and both born
 * from the same complaint: the list was a flat alphabet-soup of everything the
 * app knows, in catalogue order, with a filter bar that had started lying.
 */

import type { Food } from './types'

export interface FoodSection {
  /** Null for the catch-all section, which needs no heading when it is alone. */
  title: string | null
  foods: Food[]
}

/**
 * Your foods first, then everything else.
 *
 * Catalogue order buried the twenty things she actually eats behind four
 * hundred she does not. Saved items come first because she said so explicitly;
 * frequently-logged next because the diary said so implicitly; the rest after.
 *
 * Nothing appears twice — a favourite that is also eaten daily shows under
 * Saved only, because seeing the same row in two sections reads as a bug.
 * Sections with nothing in them are dropped rather than rendered empty.
 */
export function sectionFoods(
  all: readonly Food[],
  favourites: readonly Food[],
  often: readonly Food[]
): FoodSection[] {
  const inList = new Set(all.map((f) => f.id))
  const seen = new Set<string>()

  const take = (from: readonly Food[]) => {
    const out: Food[] = []
    for (const f of from) {
      // A favourite can outlive the food it points at — a deleted custom food,
      // or a catalogue entry that moved. Only offer what is really here.
      if (!inList.has(f.id) || seen.has(f.id)) continue
      seen.add(f.id)
      out.push(f)
    }
    return out
  }

  const saved = take(favourites)
  const usual = take(often)
  const rest = all.filter((f) => !seen.has(f.id))

  const sections: FoodSection[] = []
  if (saved.length) sections.push({ title: 'Saved', foods: saved })
  if (usual.length) sections.push({ title: 'You eat these often', foods: usual })
  if (rest.length) {
    sections.push({ title: sections.length ? 'Everything else' : null, foods: rest })
  }
  return sections
}

/**
 * Short, unique labels for the category chips.
 *
 * The old rule was `category.split(' ')[0]`, which was fine until a pack landed
 * whose categories all began with the same word: five Sushi Delivery categories
 * produced five chips reading "SUSHI", indistinguishable and four of them
 * unreachable in practice.
 *
 * The fix is mechanical rather than a lookup table, so the next pack cannot
 * reintroduce it: take the first word; where that collides, drop the prefix the
 * colliding categories share and keep what actually distinguishes them. So
 * "SUSHI DELIVERY DON" and its four siblings become Don, Bowls, Bento, Sushi
 * and Sides, while every other category keeps its short first word.
 *
 * Returns labels in the same order as the categories given.
 */
export function chipLabels(categories: readonly string[]): string[] {
  const words = categories.map((c) => c.trim().split(/\s+/).filter(Boolean))

  // Group by the naive label, so only the categories that actually collide pay
  // the cost of a longer one.
  const groups = new Map<string, number[]>()
  words.forEach((w, i) => {
    const key = (w[0] ?? '').toUpperCase()
    const g = groups.get(key)
    if (g) g.push(i)
    else groups.set(key, [i])
  })

  const out = categories.map(() => '')
  for (const idx of groups.values()) {
    if (idx.length === 1) {
      out[idx[0]] = titleCase(words[idx[0]][0] ?? categories[idx[0]])
      continue
    }
    // How many leading words every member of the group shares.
    let shared = 0
    for (;;) {
      const w = words[idx[0]][shared]
      if (w === undefined) break
      if (idx.some((i) => (words[i][shared] ?? '').toUpperCase() !== w.toUpperCase())) break
      shared += 1
    }
    for (const i of idx) {
      // Everything after the shared prefix; if a category *is* the prefix (a
      // parent alongside its children) it keeps its own last word rather than
      // becoming empty.
      const tail = words[i].slice(shared)
      out[i] = titleCase((tail.length ? tail : words[i].slice(-1)).join(' '))
    }
  }
  return out
}

/** Categories are stored SHOUTING by the workbook. A chip need not shout. */
function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(' ')
    .map((w) => (w === '&' ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
}
