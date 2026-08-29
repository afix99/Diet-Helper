'use client'

import { useEffect, useState } from 'react'
import { Onboarding } from './Onboarding'
import { hasSeenGuide } from '@/lib/onboarding'
import { useData } from '@/lib/store/provider'

/**
 * Decides whether the starter guide runs.
 *
 * Two conditions, and the second matters as much as the first: someone with
 * meals already logged is not a new user, and dropping a six-card intro over
 * their diary would be an ambush rather than help. They can still replay it
 * from Settings.
 */
export function OnboardingGate() {
  const { data, ready } = useData()
  const [show, setShow] = useState(false)
  const [decided, setDecided] = useState(false)

  useEffect(() => {
    // Wait for the store, or a returning user's entries look like an empty diary.
    if (!ready || decided) return
    setDecided(true)
    setShow(!hasSeenGuide() && data.entries.length === 0)
  }, [ready, decided, data.entries.length])

  useEffect(() => {
    const open = () => setShow(true)
    window.addEventListener('memey:open-guide', open)
    return () => window.removeEventListener('memey:open-guide', open)
  }, [])

  // The overlay is fixed and full-screen, so the page behind it must not scroll.
  useEffect(() => {
    if (!show) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [show])

  if (!show) return null
  return <Onboarding onDone={() => setShow(false)} />
}

/** Opens the guide from anywhere, without threading state through the tree. */
export function openStarterGuide(): void {
  window.dispatchEvent(new Event('memey:open-guide'))
}
