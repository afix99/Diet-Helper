import { describe, expect, it } from 'vitest'
import {
  EXITS,
  RIG_PARTS,
  TIMELINES,
  type Timeline,
  type TimelineId,
  type Track,
} from '../petMotion'

const all = Object.values(TIMELINES)
const trackFor = (t: Timeline, part: string): Track | undefined =>
  t.tracks.find((x) => x.part === part)

describe('the timelines are well formed', () => {
  it('keys every timeline by its own id', () => {
    for (const [id, t] of Object.entries(TIMELINES)) expect(t.id).toBe(id)
  })

  it('only ever animates a real rig part', () => {
    for (const t of all) {
      for (const track of t.tracks) expect(RIG_PARTS).toContain(track.part)
    }
  })

  it('never runs a track past its timeline', () => {
    for (const t of all) {
      for (const track of t.tracks) {
        expect(track.delay + track.duration).toBeLessThanOrEqual(t.duration)
      }
    }
  })

  it('gives every track a positive duration and a non-negative delay', () => {
    for (const t of all) {
      for (const track of t.tracks) {
        expect(track.duration).toBeGreaterThan(0)
        expect(track.delay).toBeGreaterThanOrEqual(0)
        expect(track.frames.length).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it('keeps keyframe offsets ascending and inside 0..1', () => {
    for (const t of all) {
      for (const track of t.tracks) {
        let last = -1
        for (const f of track.frames) {
          if (f.offset === null || f.offset === undefined) continue
          expect(f.offset).toBeGreaterThanOrEqual(0)
          expect(f.offset).toBeLessThanOrEqual(1)
          expect(f.offset).toBeGreaterThanOrEqual(last)
          last = f.offset
        }
      }
    }
  })
})

describe('nothing is left deformed', () => {
  it('ends every non-exit track at identity', () => {
    // The rig is shared and long-lived. A track that ends mid-transform leaves
    // the cat permanently squashed, and it would look like a drawing bug rather
    // than an animation one.
    for (const t of all) {
      if (EXITS.includes(t.id)) continue
      for (const track of t.tracks) {
        const last = track.frames[track.frames.length - 1]
        expect(`${t.id}/${track.part}: ${String(last.transform)}`).toBe(
          `${t.id}/${track.part}: none`
        )
      }
    }
  })

  it('names the exits explicitly rather than by accident', () => {
    expect(EXITS).toEqual(['tuck'])
    const root = trackFor(TIMELINES.tuck, 'root')!
    expect(root.frames[root.frames.length - 1].opacity).toBe(0)
  })

  it('loops the idle tracks seamlessly', () => {
    for (const track of TIMELINES.idle.tracks) {
      expect(track.iterations).toBe(Infinity)
      const first = track.frames[0]
      const last = track.frames[track.frames.length - 1]
      expect(String(last.transform)).toBe(String(first.transform))
    }
  })
})

describe('the secondary parts lag the primary — this is the whole trick', () => {
  const grow = TIMELINES.grow
  const delay = (part: string) => trackFor(grow, part)!.delay

  it('moves the body first', () => {
    const body = delay('body')
    // hop and shadow are the same instant as the body, not secondary motion:
    // the hips *are* the primary, and the shadow is that impact seen from below.
    for (const track of grow.tracks) {
      if (['body', 'hop', 'shadow'].includes(track.part)) continue
      expect(track.delay).toBeGreaterThan(body)
    }
  })

  it('carries travel on the hips and deformation on the body', () => {
    // Animating travel on body and head separately made the head detach and
    // float during the leap. One node owns travel; the rest hang off it.
    const hop = trackFor(grow, 'hop')!
    const body = trackFor(grow, 'body')!
    const head = trackFor(grow, 'head')!
    const has = (t: Track, re: RegExp) =>
      t.frames.some((f) => re.test(String(f.transform ?? '')))
    expect(has(hop, /translateY/)).toBe(true)
    expect(has(hop, /scale/)).toBe(false)
    expect(has(body, /scale/)).toBe(true)
    expect(has(body, /translateY/)).toBe(false)
    // The head may lag, but never by more than a few pixels of its own.
    const headTravel = Math.max(
      ...head.frames.map((f) => {
        const m = /translateY\((-?[\d.]+)px\)/.exec(String(f.transform ?? ''))
        return m ? Math.abs(Number(m[1])) : 0
      })
    )
    expect(headTravel).toBeLessThanOrEqual(6)
  })

  it('drives the shadow with the body, not after it', () => {
    // The contact shadow is not secondary motion — it is the same impact seen
    // from below, so any lag would read as a rendering fault.
    expect(delay('shadow')).toBe(delay('body'))
  })

  it('whips the tail tip after the tail base', () => {
    expect(delay('tailBase')).toBeGreaterThan(delay('body'))
    expect(delay('tailTip')).toBeGreaterThan(delay('tailBase'))
  })

  it('swings the tip further than the base', () => {
    const peak = (part: string) =>
      Math.max(
        ...trackFor(grow, part)!.frames.map((f) => {
          const m = /rotate\((-?[\d.]+)deg\)/.exec(String(f.transform ?? ''))
          return m ? Math.abs(Number(m[1])) : 0
        })
      )
    expect(peak('tailTip')).toBeGreaterThan(peak('tailBase'))
  })

  it('lags the head behind the body and the ears behind the head', () => {
    expect(delay('head')).toBeGreaterThan(delay('body'))
    expect(delay('earL')).toBeGreaterThan(delay('head'))
    expect(delay('earR')).toBeGreaterThan(delay('earL'))
  })

  it('settles the hat after the head', () => {
    // The one detail that sells a worn item as worn rather than painted on.
    expect(delay('hat')).toBeGreaterThan(delay('head'))
    const hat = trackFor(grow, 'hat')!
    const head = trackFor(grow, 'head')!
    // It also keeps moving after the head has stopped.
    expect(hat.delay + hat.duration).toBeGreaterThan(head.delay + head.duration)
  })

  it('never lets the hat leave the skull by more than a couple of pixels', () => {
    // More separation than this and it reads as the hat coming off.
    for (const id of ['grow', 'wake'] as const) {
      const hat = trackFor(TIMELINES[id], 'hat')
      if (!hat) continue
      const travel = Math.max(
        ...hat.frames.map((f) => {
          const m = /translateY\((-?[\d.]+)px\)/.exec(String(f.transform ?? ''))
          return m ? Math.abs(Number(m[1])) : 0
        })
      )
      expect(travel).toBeLessThanOrEqual(4)
    }
  })

  it('leaves the whiskers last of the body parts', () => {
    for (const part of ['body', 'head', 'earL', 'earR', 'tailBase', 'tailTip']) {
      expect(delay('whiskers')).toBeGreaterThan(delay(part))
    }
  })

  it('lands the number after the cat has landed', () => {
    const body = trackFor(grow, 'body')!
    // The land-squash sits at offset 0.354 of the body track.
    const landsAt = body.delay + body.duration * 0.354
    expect(delay('count')).toBeGreaterThan(landsAt)
  })

  it('applies the same lag rule to the idle loop', () => {
    const base = trackFor(TIMELINES.idle, 'tailBase')!
    const tip = trackFor(TIMELINES.idle, 'tailTip')!
    expect(tip.delay).toBeGreaterThan(base.delay)
    expect(tip.duration).toBe(base.duration)
  })
})

describe('the grow beat sheet', () => {
  const body = trackFor(TIMELINES.grow, 'body')!
  const hop = trackFor(TIMELINES.grow, 'hop')!
  const at = (offset: number) =>
    String(body.frames.find((f) => f.offset === offset)?.transform ?? '')
  const hopAt = (offset: number) =>
    String(hop.frames.find((f) => f.offset === offset)?.transform ?? '')

  it('anticipates before it leaps', () => {
    // Crouch: wider than tall. Without this the jump reads as a teleport.
    expect(at(0.138)).toContain('scale(1.08, 0.88)')
  })

  it('stretches along the direction of travel', () => {
    expect(at(0.246)).toContain('scale(0.9, 1.16)')
    expect(hopAt(0.246)).toContain('translateY(-30px)')
  })

  it('squashes on impact', () => {
    expect(at(0.354)).toContain('scale(1.14, 0.84)')
  })

  it('bounces twice, decaying', () => {
    const rises = hop.frames
      .map((f) => /translateY\((-?[\d.]+)px\)/.exec(String(f.transform ?? '')))
      .filter((m): m is RegExpExecArray => Boolean(m))
      .map((m) => Number(m[1]))
      .filter((y) => y < 0)
    // The leap, then two smaller hops.
    expect(rises).toHaveLength(3)
    expect(Math.abs(rises[1])).toBeLessThan(Math.abs(rises[0]))
    expect(Math.abs(rises[2])).toBeLessThan(Math.abs(rises[1]))
  })

  it('inverts the shadow against the cat’s height', () => {
    const shadow = trackFor(TIMELINES.grow, 'shadow')!
    const sx = (offset: number) => {
      const f = shadow.frames.find((x) => x.offset === offset)
      const m = /scaleX\(([\d.]+)\)/.exec(String(f?.transform ?? ''))
      return m ? Number(m[1]) : 1
    }
    // Smallest at the top of the leap, widest at the moment of impact.
    expect(sx(0.246)).toBeLessThan(0.7)
    expect(sx(0.354)).toBeGreaterThan(1.2)
    expect(sx(0.354)).toBeGreaterThan(sx(0.246))
  })

  it('keeps the glow small enough that it cannot widen the page', () => {
    // 96px base art: 96 * 1.9 = 182, against 256px of card content at a 320px
    // viewport. Two separate sessions were lost to a decoration that escaped.
    const glow = trackFor(TIMELINES.grow, 'glow')!
    const peak = Math.max(
      ...glow.frames.map((f) => {
        const m = /scale\(([\d.]+)\)/.exec(String(f.transform ?? ''))
        return m ? Number(m[1]) : 0
      })
    )
    expect(peak * 96).toBeLessThan(256)
  })

  it('slams the number in from oversize and blurred', () => {
    const count = trackFor(TIMELINES.grow, 'count')!
    expect(String(count.frames[0].transform)).toContain('scale(2.4)')
    expect(String(count.frames[0].filter)).toContain('blur')
    expect(count.frames[0].opacity).toBe(0)
  })
})

describe('composition', () => {
  it('adds by default so the idle loop survives a one-shot', () => {
    for (const t of all) {
      for (const track of t.tracks) {
        const owns =
          track.frames.some((f) => f.opacity !== undefined) ||
          track.part === 'root' ||
          track.part === 'count'
        if (owns) expect(track.composite).toBe('replace')
        else expect(track.composite).toBeUndefined()
      }
    }
  })

  it('gives the four idle loops mutually non-harmonic periods', () => {
    // If these shared a common factor the cat would visibly resync and read as
    // a machine rather than an animal.
    const periods = [...new Set(TIMELINES.idle.tracks.map((t) => t.duration))]
    expect(periods.length).toBeGreaterThanOrEqual(4)
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
    for (let i = 0; i < periods.length; i += 1) {
      for (let j = i + 1; j < periods.length; j += 1) {
        const g = gcd(periods[i], periods[j])
        expect(g).toBeLessThan(Math.min(periods[i], periods[j]) / 2)
      }
    }
  })
})

describe('every state the cat can be in has motion', () => {
  it('covers all five timelines', () => {
    const ids: TimelineId[] = ['idle', 'wake', 'grow', 'greet', 'tuck']
    for (const id of ids) expect(TIMELINES[id]).toBeDefined()
  })

  it('makes grow the biggest moment', () => {
    for (const t of all) {
      if (t.id === 'grow' || t.id === 'idle') continue
      expect(TIMELINES.grow.duration).toBeGreaterThan(t.duration)
      expect(TIMELINES.grow.tracks.length).toBeGreaterThan(t.tracks.length)
    }
  })
})
