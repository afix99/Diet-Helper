/**
 * Getting the diary out of the browser and back into it.
 *
 * The whole record lives in one browser's localStorage. `local.ts` says why
 * that is precarious in its own comment — iOS evicts a PWA's storage after
 * roughly seven days of non-use — and until now there was no way to get a copy
 * out before that happened. Losing months of logging to a storage sweep is a
 * far more likely ending for this data than any of the scaling problems an
 * audit tends to look for.
 *
 * Pure functions here, DOM in the component, so the interesting parts are
 * testable without a browser.
 */
import { repair, type RepairResult } from './store/schema'
import type { AppData } from './store/types'

/** Bumped only if the shape changes in a way an importer must know about. */
export const BACKUP_VERSION = 1

export interface BackupFile {
  app: 'memey-diet-planner'
  version: number
  exportedAt: string
  data: AppData
}

export function toBackup(data: AppData, now = new Date()): BackupFile {
  return {
    app: 'memey-diet-planner',
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    data,
  }
}

/** `memey-diet-planner-2026-09-02.json` — sorts chronologically in a folder. */
export function backupFilename(now = new Date()): string {
  return `memey-diet-planner-${now.toISOString().slice(0, 10)}.json`
}

export interface ReadResult {
  ok: boolean
  /** Why it could not be read. Null when `ok`. */
  error: string | null
  result: RepairResult | null
  /** What the file turned out to hold, for the confirmation step. */
  summary: { meals: number; weighIns: number; activities: number; customFoods: number } | null
}

/**
 * Read a file someone chose and say what is in it, without applying anything.
 *
 * Deliberately permissive about the wrapper and strict about nothing: a file
 * that is a bare `AppData` (someone pulled it out of localStorage by hand)
 * loads just as well as one this app wrote, because refusing it would help
 * nobody. `repair` is what makes that safe — whatever shape arrives, what comes
 * out the far side is a complete, sane diary.
 */
export function readBackup(text: string): ReadResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return {
      ok: false,
      error: 'That file is not readable JSON. Pick the .json file this app downloaded.',
      result: null,
      summary: null,
    }
  }

  const wrapped =
    typeof parsed === 'object' && parsed !== null && 'data' in parsed
      ? (parsed as { data: unknown }).data
      : parsed

  const result = repair(wrapped)
  const d = result.data

  // A file with nothing in it is almost certainly the wrong file, and replacing
  // a real diary with it would be the one unrecoverable mistake here.
  if (
    d.entries.length === 0 &&
    d.weights.length === 0 &&
    d.activities.length === 0 &&
    d.customFoods.length === 0
  ) {
    return {
      ok: false,
      error: 'That file has no meals, weigh-ins or foods in it. Nothing was changed.',
      result: null,
      summary: null,
    }
  }

  return {
    ok: true,
    error: null,
    result,
    summary: {
      meals: d.entries.length,
      weighIns: d.weights.length,
      activities: d.activities.length,
      customFoods: d.customFoods.length,
    },
  }
}
