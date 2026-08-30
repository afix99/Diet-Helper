'use client'

import { useEffect, useState } from 'react'
import { SegmentedControl } from './ui'
import { setSoundEnabled, sound, soundEnabled } from '@/lib/sound'

const OPTIONS = [
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
] as const

/**
 * The one new setting. A phone that makes a noise you did not expect needs an
 * off switch within reach, and this is where someone will look for it.
 *
 * Turning it on plays the cue immediately, so you hear what you just agreed to
 * rather than finding out later in a quiet room.
 */
export function SoundToggle() {
  // Same reasoning as ThemeToggle: render the default, then catch up after
  // mount, so the server and the first client render agree.
  const [value, setValue] = useState<'on' | 'off'>('on')

  useEffect(() => {
    setValue(soundEnabled() ? 'on' : 'off')
  }, [])

  return (
    <SegmentedControl
      label="Sound"
      options={OPTIONS.map((o) => ({ ...o }))}
      value={value}
      onChange={(next) => {
        setValue(next)
        setSoundEnabled(next === 'on')
        if (next === 'on') sound('log')
      }}
    />
  )
}
