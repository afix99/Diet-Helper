import { describe, expect, it } from 'vitest'
import type { ReactElement } from 'react'
import { Icon, type IconName } from '@/components/icons'

/**
 * The floor under an icon's width.
 *
 * `<svg width="16">` inside a flex row is a starting size, not a minimum:
 * `flex-shrink` defaults to 1, so a crowded row takes its space out of the
 * icon before anything else, and keeps taking until the icon is zero wide.
 * Nothing overflows, so no overflow check notices; the glyph simply is not
 * drawn. The badges card on Today lost its chevron that way at 320px.
 *
 * `Icon` now carries `shrink-0` itself. These tests hold that in place — a
 * browser check for the same thing exists (`pnpm check:crushed`) but needs a
 * running build, and this one costs nothing.
 */
describe('Icon sizing', () => {
  const props = (el: ReactElement) => el.props as Record<string, unknown>

  it('never lets a row squeeze it', () => {
    const el = Icon({ name: 'chevron', size: 16 }) as ReactElement
    expect(String(props(el).className)).toContain('shrink-0')
  })

  it('keeps the caller className as well', () => {
    const el = Icon({ name: 'chevron', size: 16, className: 'text-faint' }) as ReactElement
    const cls = String(props(el).className)
    expect(cls).toContain('shrink-0')
    expect(cls).toContain('text-faint')
  })

  it('renders at the size it was asked for', () => {
    const el = Icon({ name: 'chevron', size: 13 }) as ReactElement
    expect(props(el).width).toBe(13)
    expect(props(el).height).toBe(13)
  })

  it('draws something for every name it advertises', () => {
    const names: IconName[] = ['today', 'calendar', 'search', 'chart', 'chevron', 'close']
    for (const name of names) {
      const el = Icon({ name }) as ReactElement
      expect(props(el).children, name).toBeTruthy()
    }
  })
})
