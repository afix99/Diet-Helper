'use client'

import { useEffect, useState } from 'react'
import { SegmentedControl } from './ui'
import { burstAt } from './BurstLayer'
import { DEFAULT_MOTION, MOTION_OPTIONS, readMotion, writeMotion, type MotionLevel } from '@/lib/motion'

/**
 * How lively the app is allowed to be.
 *
 * Not an on/off, because off already exists at the operating-system level and
 * `prefers-reduced-motion` overrides this either way. This is the difference
 * between a phone that celebrates and one that just works.
 *
 * Choosing Full fires a burst immediately, so you see what you agreed to rather
 * than discovering it later.
 */
export function MotionToggle() {
  const [value, setValue] = useState<MotionLevel>(DEFAULT_MOTION)

  useEffect(() => {
    setValue(readMotion())
  }, [])

  return (
    <SegmentedControl
      label="Motion"
      options={MOTION_OPTIONS}
      value={value}
      onChange={(next) => {
        setValue(next)
        writeMotion(next)
        if (next === 'full') {
          burstAt({
            x: window.innerWidth / 2,
            y: window.innerHeight * 0.4,
            food: null,
            seed: 'motion-on',
            scale: 1.5,
          })
        }
      }}
    />
  )
}
