import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PET_NAME,
  MAX_PET_NAME,
  PET_STAGES,
  normalisePetName,
  nextStage,
  poseFor,
  stageFor,
  statusLine,
  type PetPart,
} from '../pet'

describe('growth never regresses', () => {
  it('is monotonic non-decreasing across four hundred days', () => {
    // The promise made to the user, asserted rather than described. If anyone
    // ever makes the stage depend on the *current* streak instead of the best
    // one, this is the test that stops it.
    let last = -1
    for (let days = 0; days <= 400; days += 1) {
      const index = stageFor(days).index
      expect(index).toBeGreaterThanOrEqual(last)
      last = index
    }
  })

  it('lands on the documented thresholds', () => {
    expect(stageFor(0).name).toBe('Asleep')
    expect(stageFor(1).name).toBe('Kitten')
    expect(stageFor(2).name).toBe('Kitten')
    expect(stageFor(3).name).toBe('Curious')
    expect(stageFor(7).name).toBe('Playful')
    expect(stageFor(14).name).toBe('Settled')
    expect(stageFor(30).name).toBe('Companion')
    expect(stageFor(60).name).toBe('Old Friend')
    expect(stageFor(5000).name).toBe('Old Friend')
  })

  it('never falls over on nonsense input', () => {
    expect(stageFor(-40).index).toBe(0)
    expect(stageFor(Number.NaN).index).toBe(0)
    expect(stageFor(Number.POSITIVE_INFINITY).index).toBe(PET_STAGES.length - 1)
  })
})

describe('the stages are actually distinct', () => {
  it('adds at least one part at every stage', () => {
    for (let i = 1; i < PET_STAGES.length; i += 1) {
      const before = new Set<PetPart>(PET_STAGES[i - 1].parts)
      const added = PET_STAGES[i].parts.filter((p) => !before.has(p))
      expect(added.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('never drops a part it once had', () => {
    for (let i = 1; i < PET_STAGES.length; i += 1) {
      for (const part of PET_STAGES[i - 1].parts) {
        expect(PET_STAGES[i].parts).toContain(part)
      }
    }
  })

  it('gives no two stages the same silhouette', () => {
    const sets = PET_STAGES.map((s) => [...s.parts].sort().join('|'))
    expect(new Set(sets).size).toBe(PET_STAGES.length)
  })

  it('has thresholds in ascending order, starting at zero', () => {
    expect(PET_STAGES[0].minStreak).toBe(0)
    for (let i = 1; i < PET_STAGES.length; i += 1) {
      expect(PET_STAGES[i].minStreak).toBeGreaterThan(PET_STAGES[i - 1].minStreak)
    }
  })
})

describe('the cat never judges what you ate', () => {
  it('takes only whether you logged, and nothing else', () => {
    // poseFor's signature is the guarantee: there is no parameter through which
    // a calorie total could reach it. This asserts the behaviour too, so that
    // widening the signature later fails here rather than shipping.
    expect(poseFor(true)).toBe('awake')
    expect(poseFor(false)).toBe('curled')
    expect(poseFor.length).toBe(1)
  })

  it('says nothing that could read as disappointment', () => {
    const forbidden = /sad|hungry|lonely|miss(es)? you|disappoint|starv|fail|lazy|bad/i
    for (const pose of ['curled', 'awake'] as const) {
      for (const streak of [0, 1, 9, 400]) {
        expect(statusLine(pose, streak)).not.toMatch(forbidden)
      }
    }
    for (const stage of PET_STAGES) {
      expect(stage.name).not.toMatch(forbidden)
    }
  })

  it('is resting rather than broken when a run has ended', () => {
    expect(statusLine('curled', 0)).toBe('Resting')
    expect(statusLine('curled', 5)).toBe('Dozing')
  })
})

describe('the next milestone', () => {
  it('counts down to the next stage', () => {
    expect(nextStage(0)).toEqual({ stage: PET_STAGES[1], daysAway: 1 })
    expect(nextStage(5)?.daysAway).toBe(2)
    expect(nextStage(29)?.daysAway).toBe(1)
  })

  it('returns null once fully grown', () => {
    expect(nextStage(60)).toBeNull()
    expect(nextStage(900)).toBeNull()
  })
})

describe('naming', () => {
  it('trims, collapses whitespace and caps the length', () => {
    expect(normalisePetName('  Tuna  ')).toBe('Tuna')
    expect(normalisePetName('Mr    Whiskers')).toBe('Mr Whiskers')
    expect(normalisePetName('x'.repeat(40))).toHaveLength(MAX_PET_NAME)
  })

  it('falls back rather than leaving a pet unnamed', () => {
    expect(normalisePetName('')).toBe(DEFAULT_PET_NAME)
    expect(normalisePetName('    ')).toBe(DEFAULT_PET_NAME)
  })
})
