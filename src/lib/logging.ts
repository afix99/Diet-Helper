'use client'

import { useCallback } from 'react'
import { useData } from './store/provider'
import { RECIPES } from './catalogue'
import { findFood, latestWeight } from './selectors'
import { bodyWeightFor } from './exercise'
import * as edits from './logEdits'
import type { AccessorySlot, Exercise, Food, LogEntry, MealSlot } from './types'

/**
 * Mutations for the food log, shared by Today, Week and Recipes.
 *
 * The arithmetic lives in `logEdits.ts` as plain AppData -> AppData functions;
 * this is the React binding over it. Splitting them is what made the write path
 * testable without a renderer.
 */
export function useLogging() {
  const { data, update } = useData()

  const logFood = useCallback(
    (date: string, slot: MealSlot, food: Food, servings = 1) => {
      update((d) => edits.addFood(d, date, slot, food, servings))
    },
    [update]
  )

  const logRecipe = useCallback(
    (date: string, slot: MealSlot, recipeId: string, servings = 1) => {
      const recipe = RECIPES.find((r) => r.id === recipeId)
      if (!recipe) return
      update((d) => edits.addRecipe(d, date, slot, recipe, servings))
    },
    [update]
  )

  const removeEntry = useCallback(
    (id: string) => update((d) => edits.removeEntry(d, id)),
    [update]
  )

  const setServings = useCallback(
    (id: string, servings: number) => update((d) => edits.setServings(d, id, servings)),
    [update]
  )

  const toggleFavourite = useCallback(
    (foodId: string) => update((d) => edits.toggleFavourite(d, foodId)),
    [update]
  )

  const copyDay = useCallback(
    (from: string, to: string) => update((d) => edits.copyDay(d, from, to)),
    [update]
  )

  const addCustomFood = useCallback(
    (food: Omit<Food, 'id' | 'slug' | 'ownerId'>) => {
      // The id is minted here so the caller can select the new food immediately,
      // rather than waiting for the store round-trip to tell it what happened.
      const id = `custom-${edits.newId()}`
      update((d) => ({
        ...d,
        customFoods: [...d.customFoods, { ...food, id, slug: id, ownerId: 'local' }],
      }))
      return id
    },
    [update]
  )

  const deleteCustomFood = useCallback(
    (id: string) => update((d) => edits.deleteCustomFood(d, id)),
    [update]
  )

  /*
   * Exercise is priced against the same body the rest of the app quotes:
   * latest weigh-in, falling back to the start weight. Reading it here rather
   * than inside the reducer keeps the reducer pure and testable.
   */
  const logActivity = useCallback(
    (date: string, exercise: Exercise, minutes: number) => {
      update((d) =>
        edits.addActivity(
          d,
          date,
          exercise,
          minutes,
          bodyWeightFor(d.profile.startWeightKg, latestWeight(d))
        )
      )
    },
    [update]
  )

  const removeActivity = useCallback(
    (id: string) => update((d) => edits.removeActivity(d, id)),
    [update]
  )

  const setActivityMinutes = useCallback(
    (id: string, minutes: number) => update((d) => edits.setActivityMinutes(d, id, minutes)),
    [update]
  )

  const renamePet = useCallback(
    (name: string) => update((d) => edits.renamePet(d, name)),
    [update]
  )
  const sendPetHome = useCallback(() => update((d) => edits.sendPetHome(d)), [update])
  const callPetOut = useCallback(() => update((d) => edits.callPetOut(d)), [update])
  const markPetStageSeen = useCallback(
    (stageIndex: number) => update((d) => edits.markPetStageSeen(d, stageIndex)),
    [update]
  )

  const wearItem = useCallback(
    (slot: AccessorySlot, id: string) => update((d) => edits.wearItem(d, slot, id)),
    [update]
  )
  const removeItem = useCallback(
    (slot: AccessorySlot) => update((d) => edits.removeItem(d, slot)),
    [update]
  )
  const wearCostume = useCallback(
    (costumeId: string) => update((d) => edits.wearCostume(d, costumeId)),
    [update]
  )
  const takeOffCostume = useCallback(() => update((d) => edits.takeOffCostume(d)), [update])
  const markUnlocksSeen = useCallback(
    (ids: readonly string[]) => update((d) => edits.markUnlocksSeen(d, ids)),
    [update]
  )

  const resolveFood = useCallback((id: string) => findFood(data, id), [data])

  return {
    logFood,
    logRecipe,
    removeEntry,
    setServings,
    toggleFavourite,
    copyDay,
    addCustomFood,
    deleteCustomFood,
    logActivity,
    removeActivity,
    setActivityMinutes,
    renamePet,
    sendPetHome,
    callPetOut,
    markPetStageSeen,
    wearItem,
    removeItem,
    wearCostume,
    takeOffCostume,
    markUnlocksSeen,
    resolveFood,
  }
}

export type { LogEntry }
