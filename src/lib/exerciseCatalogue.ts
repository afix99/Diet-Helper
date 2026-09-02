/**
 * The activity catalogue, in its own module.
 *
 * Split out of `catalogue.ts` alongside the recipes and the workbook seeds: a
 * screen that prices a walk has no use for 441 foods, and reading `EXERCISES`
 * from the module that builds `FOODS` charged it for them. See the note in
 * `seedDefaults.ts`.
 *
 * MET values come from the Compendium of Physical Activities (Ainsworth et al.,
 * 2011). They are population means measured mostly on young lean adults, so any
 * individual is easily 20-30% either side — which is why every screen that
 * shows a burn calls it an estimate.
 */
import exercisesJson from '../../seed/exercises.json'
import type { Exercise } from './types'

export const EXERCISES: Exercise[] = (
  exercisesJson as { slug: string; category: string; name: string; met: number; notes: string | null }[]
).map((e) => ({
  id: e.slug,
  slug: e.slug,
  category: e.category,
  name: e.name,
  met: e.met,
  notes: e.notes,
}))

/** Catalogue order, preserved — gentlest groups are not first, movement is. */
export const EXERCISE_CATEGORIES: string[] = EXERCISES.reduce<string[]>((acc, e) => {
  if (!acc.includes(e.category)) acc.push(e.category)
  return acc
}, [])
