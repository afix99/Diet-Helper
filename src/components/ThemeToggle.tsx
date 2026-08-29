'use client'

import { useEffect, useState } from 'react'
import { SegmentedControl } from './ui'
import {
  DEFAULT_THEME,
  THEME_OPTIONS,
  readTheme,
  writeTheme,
  type ThemeChoice,
} from '@/lib/theme'

export function ThemeToggle() {
  // Server-render the default rather than reading localStorage during render:
  // the inline script in the document head has already painted the right theme,
  // so this only has to catch up, and a mismatched first render would hydrate
  // with a warning.
  const [choice, setChoice] = useState<ThemeChoice>(DEFAULT_THEME)

  useEffect(() => {
    setChoice(readTheme())
  }, [])

  return (
    <SegmentedControl
      label="Appearance"
      options={THEME_OPTIONS}
      value={choice}
      onChange={(next) => {
        setChoice(next)
        writeTheme(next)
      }}
    />
  )
}
