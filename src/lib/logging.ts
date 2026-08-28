'use client'

import { useCallback } from 'react'
import { useData } from './store/provider'
import { RECIPES } from './catalogue'
import { findFood } from './selectors'
import type { Food, LogEntry, MealSlot } from './types'

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `e${Date.now()}${Math.random().toString(16).slice(2)}`
}

/** Mutations for the food log, shared by Today, Week and Recipes. */
export function useLogging() {
  const { data, update } = useData()

  const logFood = useCallback(
    (date: string, slot: MealSlot, food: Food, servings = 1) => {
      update((d) => ({
        ...d,
        entries: [
          ...d.entries,
          {
            id: newId(),
            date,
            slot,
            foodId: food.id,
            recipeId: null,
            // Snapshot a custom food's name too: it lives in the store, so
            // deleting it later would otherwise orphan every entry using it.
            customName: food.ownerId ? food.name : null,
            servings,
            notes: null,
            // Snapshot the macros so editing a food later can't rewrite history.
            macros: {
              kcal: food.kcal,
              protein: food.protein,
              carbs: food.carbs,
              fat: food.fat,
              fibre: food.fibre,
            },
          },
        ],
      }))
    },
    [update]
  )

  const logRecipe = useCallback(
    (date: string, slot: MealSlot, recipeId: string, servings = 1) => {
      const recipe = RECIPES.find((r) => r.id === recipeId)
      if (!recipe) return
      update((d) => ({
        ...d,
        entries: [
          ...d.entries,
          {
            id: newId(),
            date,
            slot,
            foodId: null,
            recipeId: recipe.id,
            customName: null,
            servings,
            notes: null,
            macros: {
              kcal: recipe.kcal,
              protein: recipe.protein,
              carbs: recipe.carbs,
              fat: recipe.fat,
              fibre: recipe.fibre,
            },
          },
        ],
      }))
    },
    [update]
  )

  const removeEntry = useCallback(
    (id: string) => {
      update((d) => ({ ...d, entries: d.entries.filter((e) => e.id !== id) }))
    },
    [update]
  )

  const setServings = useCallback(
    (id: string, servings: number) => {
      const clamped = Math.max(0.25, Math.round(servings * 4) / 4)
      update((d) => ({
        ...d,
        entries: d.entries.map((e) => (e.id === id ? { ...e, servings: clamped } : e)),
      }))
    },
    [update]
  )

  const toggleFavourite = useCallback(
    (foodId: string) => {
      update((d) => ({
        ...d,
        favourites: d.favourites.includes(foodId)
          ? d.favourites.filter((f) => f !== foodId)
          : [...d.favourites, foodId],
      }))
    },
    [update]
  )

  /** Copy a whole day's meals onto another date — the Week view's shortcut. */
  const copyDay = useCallback(
    (from: string, to: string) => {
      update((d) => {
        const source = d.entries.filter((e) => e.date === from)
        const kept = d.entries.filter((e) => e.date !== to)
        return {
          ...d,
          entries: [...kept, ...source.map((e) => ({ ...e, id: newId(), date: to }))],
        }
      })
    },
    [update]
  )

  const addCustomFood = useCallback(
    (food: Omit<Food, 'id' | 'slug' | 'ownerId'>) => {
      const id = `custom-${newId()}`
      update((d) => ({
        ...d,
        customFoods: [...d.customFoods, { ...food, id, slug: id, ownerId: 'local' }],
      }))
      return id
    },
    [update]
  )

  /**
   * Removes a food from the catalogue. Past entries keep their snapshotted
   * name and macros, so history stays readable.
   */
  const deleteCustomFood = useCallback(
    (id: string) => {
      update((d) => ({
        ...d,
        customFoods: d.customFoods.filter((f) => f.id !== id),
        favourites: d.favourites.filter((f) => f !== id),
      }))
    },
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
    resolveFood,
  }
}

export type { LogEntry }
