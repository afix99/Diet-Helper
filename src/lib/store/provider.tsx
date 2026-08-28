'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createStore } from './index'
import { defaultData } from './defaults'
import type { AppData } from './types'

interface Ctx {
  data: AppData
  ready: boolean
  update: (fn: (draft: AppData) => AppData) => void
  storeKind: 'local' | 'supabase'
}

const DataContext = createContext<Ctx | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const store = useMemo(() => createStore(), [])
  const [data, setData] = useState<AppData>(defaultData)
  const [ready, setReady] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    store
      .load()
      .then((loaded) => {
        if (!cancelled) setData(loaded)
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [store])

  const update = useCallback(
    (fn: (draft: AppData) => AppData) => {
      setData((prev) => {
        const next = fn(prev)
        // Debounced so holding a stepper doesn't hammer storage.
        if (saveTimer.current) clearTimeout(saveTimer.current)
        saveTimer.current = setTimeout(() => {
          void store.save(next)
        }, 300)
        return next
      })
    },
    [store]
  )

  // Don't lose the last edit if the tab closes inside the debounce window.
  useEffect(() => {
    const flush = () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
        void store.save(data)
      }
    }
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [store, data])

  const value = useMemo<Ctx>(
    () => ({ data, ready, update, storeKind: store.kind }),
    [data, ready, update, store.kind]
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(): Ctx {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used inside <DataProvider>')
  return ctx
}
