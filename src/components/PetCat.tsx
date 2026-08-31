'use client'

import { forwardRef, useId, useImperativeHandle, useRef } from 'react'
import type { PetPart, PetPose, PetStage } from '@/lib/pet'
import type { Rig } from '@/lib/petMotion'
import type { AccessorySlot } from '@/lib/types'
import { AccessoryDefs, PetAccessory } from './PetAccessory'

/**
 * The cat, as a rig rather than a picture.
 *
 * Every animated part is its own `<g>` with its own `transform-origin`, which
 * is the whole reason this is hand-drawn SVG and not an image: a tail can only
 * whip if the tail is a separate object that pivots at its base. A flat
 * illustration, however lovely, cannot crouch, leap or blink.
 *
 * `transform-box: fill-box` is load-bearing. Without it, SVG transform-origin
 * percentages resolve against the *viewport* rather than the element's own box,
 * so `50% 100%` on the tail would pivot around a point somewhere off in the
 * corner of the drawing and every rotation would swing the part across the
 * canvas. With it, each group pivots inside itself, which is what a joint is.
 *
 * **The look**, taken from the reference art: two-tone fur with a cream chest,
 * muzzle and paws; tabby stripes; very large eyes with an iris gradient and
 * three highlights; a soft fur rim; and a coat that warms from pink towards
 * peach as the cat grows. Volume comes from one light direction held across
 * every part — a gradient from the upper left, a rim on the lit edge, a
 * specular patch where the form turns, and ambient occlusion in the crevices.
 * The soft arc under the chin does more work than anything else here: without
 * it the head reads as a ball balanced on a body rather than as one animal.
 *
 * Gradient ids are per-instance via `useId`, because the sheet renders eight
 * cats in one document and duplicate ids silently cross-wire their paint.
 */

export interface PetCatHandle {
  /** The animated groups, by rig part name. */
  rig: () => Rig
}

const VIEW = 120

/**
 * The coat warms as the cat grows — pink kitten to peach adult, which is the
 * progression in the reference art. One lerp rather than seven palettes, so a
 * new stage cannot arrive without a colour.
 */
const YOUNG = { lit: '#ffc2d8', mid: '#f79ab8', deep: '#cf6b90' }
const GROWN = { lit: '#ffd7b6', mid: '#f0ab85', deep: '#c98059' }
const CREAM = '#fff4ea'
const DARK = '#2a1420'
const NOSE = '#e88fa0'

const mix = (a: string, b: string, t: number) => {
  const n = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16)
  const c = (i: number) => Math.round(n(a, i) + (n(b, i) - n(a, i)) * t)
  return `#${[0, 1, 2].map((i) => c(i).toString(16).padStart(2, '0')).join('')}`
}

function coatFor(index: number) {
  const t = Math.min(1, Math.max(0, index / 6))
  return {
    lit: mix(YOUNG.lit, GROWN.lit, t),
    mid: mix(YOUNG.mid, GROWN.mid, t),
    deep: mix(YOUNG.deep, GROWN.deep, t),
  }
}

export const PetCat = forwardRef<
  PetCatHandle,
  {
    stage: PetStage
    pose: PetPose
    size?: number
    className?: string
    /** What the cat is wearing, already filtered to what is still unlocked. */
    worn?: Partial<Record<AccessorySlot, string | null>>
  }
>(function PetCat({ stage, pose, size = 104, className = '', worn = {} }, ref) {
  const has = (part: PetPart) => stage.parts.includes(part)
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const g = (name: string) => `${name}-${uid}`
  const coat = coatFor(stage.index)

  const root = useRef<SVGGElement>(null)
  const hop = useRef<SVGGElement>(null)
  const body = useRef<SVGGElement>(null)
  const head = useRef<SVGGElement>(null)
  const earL = useRef<SVGGElement>(null)
  const earR = useRef<SVGGElement>(null)
  const eyeL = useRef<SVGGElement>(null)
  const eyeR = useRef<SVGGElement>(null)
  const whiskers = useRef<SVGGElement>(null)
  const hat = useRef<SVGGElement>(null)
  const pawL = useRef<SVGGElement>(null)
  const pawR = useRef<SVGGElement>(null)
  const tailBase = useRef<SVGGElement>(null)
  const tailTip = useRef<SVGGElement>(null)
  const shadow = useRef<SVGGElement>(null)

  useImperativeHandle(ref, () => ({
    rig: () => ({
      root: root.current,
      hop: hop.current,
      body: body.current,
      head: head.current,
      earL: earL.current,
      earR: earR.current,
      eyeL: eyeL.current,
      eyeR: eyeR.current,
      whiskers: whiskers.current,
      hat: hat.current,
      pawL: pawL.current,
      pawR: pawR.current,
      tailBase: tailBase.current,
      tailTip: tailTip.current,
      shadow: shadow.current,
    }),
  }))

  /*
   * Curled is a loaf: the body spreads and flattens, the head sinks into it and
   * the tail comes round the front. Held as transforms on the rig groups rather
   * than as a second drawing, so there is one cat and `wake` has something to
   * animate away from.
   */
  const curled = pose === 'curled'
  const ease = 'transform 380ms cubic-bezier(0.22,1,0.36,1)'

  const BODY_D =
    'M60 58 C 38 58, 25 76, 25 94 C 25 108, 41 115, 60 115 ' +
    'C 79 115, 95 108, 95 94 C 95 76, 82 58, 60 58 Z'
  const HEAD_D =
    'M60 15 C 80 15, 93 28, 93 46 C 93 63, 79 73, 60 73 ' +
    'C 41 73, 27 63, 27 46 C 27 28, 40 15, 60 15 Z'

  const eye = (cx: number) => (
    <>
      <ellipse cx={cx} cy={47} rx={8.6} ry={9.9} fill={`url(#${g('iris')})`} />
      <ellipse cx={cx} cy={48.4} rx={4.7} ry={6.3} fill={DARK} />
      {/* Three highlights: the big one carries the gloss, the small ones the
          wetness. Two is flat; four is a disco ball. */}
      <ellipse cx={cx - 3.1} cy={43.2} rx={3.2} ry={3.6} fill="#fff" />
      <ellipse cx={cx + 2.8} cy={51.6} rx={1.9} ry={1.5} fill="#fff" opacity={0.75} />
      <circle cx={cx + 3.4} cy={42.6} r={1} fill="#fff" opacity={0.9} />
    </>
  )

  return (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      width={size}
      height={size}
      role="img"
      aria-label={`${stage.name} cat, ${curled ? 'curled up' : 'sitting up'}`}
      className={className}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={g('body')} x1="0.12" y1="0" x2="0.42" y2="1">
          <stop offset="0" stopColor={coat.lit} />
          <stop offset="0.45" stopColor={coat.mid} />
          <stop offset="1" stopColor={coat.deep} />
        </linearGradient>
        <linearGradient id={g('head')} x1="0.14" y1="0" x2="0.44" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="0.28" stopColor={coat.lit} />
          <stop offset="0.72" stopColor={coat.mid} />
          <stop offset="1" stopColor={coat.deep} />
        </linearGradient>
        {/* The eye. Light pools at the bottom of an iris, not the top. */}
        <radialGradient id={g('iris')} cx="50%" cy="72%" r="72%">
          <stop offset="0" stopColor="#8fd4f5" />
          <stop offset="0.55" stopColor="#4b93d4" />
          <stop offset="1" stopColor="#23507f" />
        </radialGradient>
        <radialGradient id={g('bloom')} cx="50%" cy="44%" r="50%">
          <stop offset="0" stopColor="#ff5c9c" stopOpacity="0.28" />
          <stop offset="0.6" stopColor="#ff7cae" stopOpacity="0.11" />
          <stop offset="1" stopColor="#ff7cae" stopOpacity="0" />
        </radialGradient>
        {/* Ambient occlusion under the chin: the join, not a shape. */}
        <radialGradient id={g('ao')} cx="50%" cy="12%" r="70%">
          <stop offset="0" stopColor="#5c1c3a" stopOpacity="0.4" />
          <stop offset="1" stopColor="#5c1c3a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={g('flame')} x1="0.5" y1="1" x2="0.5" y2="0">
          <stop offset="0" stopColor="#ff2f7a" />
          <stop offset="0.55" stopColor="#ff6fa8" />
          <stop offset="1" stopColor="#ffc2dc" />
        </linearGradient>
        <filter id={g('soft')} x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        {/* The fur rim. A blurred light stroke reads as fluff far more cheaply
            than a scalloped outline, and it survives being drawn at 40px. */}
        <filter id={g('fur')} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
        <AccessoryDefs gid={g} />
      </defs>

      {/* One rule for every joint, so a new part cannot be added without one. */}
      <style>{`
        .pj-${uid} { transform-box: fill-box; }
        .pjc-${uid} { transform-origin: 50% 50%; }
        .pjb-${uid} { transform-origin: 50% 100%; }
        .pjt-${uid} { transform-origin: 50% 0%; }
      `}</style>

      <g ref={root} className={`pj-${uid} pjc-${uid}`}>
        <circle cx={60} cy={56} r={54} fill={`url(#${g('bloom')})`} />

        {/* Contact shadow. Stays on the floor while the cat leaves it. */}
        <g ref={shadow} className={`pj-${uid} pjc-${uid}`} style={{ opacity: 0.28 }}>
          <ellipse
            cx={60}
            cy={curled ? 112 : 114}
            rx={curled ? 33 : 27}
            ry={5}
            fill="#5c1c3a"
            filter={`url(#${g('soft')})`}
          />
        </g>

        {/* Stage size. Static and outside the rig, so it cannot fight `greet`
            and `tuck`, which animate `root`. */}
        {/* The flame lives above the ears, so the stage that has one shrinks
            slightly to make room inside the viewBox rather than painting
            through the card it sits in. */}
        <g
          transform={`translate(60 118) scale(${stage.scale * (has('flame') ? 0.88 : 1)}) translate(-60 -118)`}
        >
          <g ref={hop} className={`pj-${uid} pjb-${uid}`}>
            {/* Back pieces first, so wings and capes sit behind everything and
                travel with the hips through the leap. */}
            <PetAccessory id={worn.back ?? null} g={g} />

            {/* Tail, behind the body, banded like the reference. */}
            {has('tail') && (
              <g
                ref={tailBase}
                className={`pj-${uid} pjb-${uid}`}
                style={{
                  /*
                   * In the loaf the tail wraps round the front of the body.
                   * The pivot is the tail's own base, so this is one rotation:
                   * the drawn tail points up-and-right at about -60 degrees, and
                   * -118 more lays it flat along the bottom edge, pointing left.
                   * An earlier attempt combined a large translate with a
                   * positive rotation and left it sticking out sideways like a
                   * plank.
                   */
                  transform: curled ? 'rotate(-118deg) scale(0.92)' : undefined,
                  transition: ease,
                }}
              >
                <path
                  d="M88 106 C 105 104, 111 89, 106 75"
                  fill="none"
                  stroke={`url(#${g('body')})`}
                  strokeWidth={11}
                  strokeLinecap="round"
                />
                <g ref={tailTip} className={`pj-${uid} pjb-${uid}`}>
                  <path
                    d="M106 76 C 102 63, 95 56, 87 52"
                    fill="none"
                    stroke={`url(#${g('body')})`}
                    strokeWidth={8.5}
                    strokeLinecap="round"
                  />
                  {/* A cream tip, as in the reference. */}
                  <path
                    d="M92 55 C 90 53, 89 52.5, 87 52"
                    fill="none"
                    stroke={CREAM}
                    strokeWidth={8}
                    strokeLinecap="round"
                  />
                  {has('markings') && (
                    <path
                      d="M104 69 l 5.5 -1.6 M99 60 l 5.5 -1.6"
                      stroke={coat.deep}
                      strokeWidth={2.8}
                      strokeLinecap="round"
                      opacity={0.55}
                    />
                  )}
                </g>
              </g>
            )}

            {/* Body. The primary — everything else lags this. */}
            <g
              ref={body}
              className={`pj-${uid} pjb-${uid}`}
              style={{
                transform: curled ? 'translateY(7px) scale(1.22, 0.74)' : undefined,
                transition: ease,
              }}
            >
              {/* Fur rim first, so the fluff sits outside the silhouette. */}
              <path
                d={BODY_D}
                fill="none"
                stroke={CREAM}
                strokeWidth={4}
                opacity={0.55}
                filter={`url(#${g('fur')})`}
              />
              <path d={BODY_D} fill={`url(#${g('body')})`} />

              {/* Cream chest and belly — the two-tone coat is most of the look. */}
              <path
                d="M60 66 C 48 66, 40 80, 40 94 C 40 106, 49 113, 60 113
                   C 71 113, 80 106, 80 94 C 80 80, 72 66, 60 66 Z"
                fill={CREAM}
                opacity={0.92}
              />

              {has('markings') && (
                <path
                  d="M35 84 q 6 -4 10 -2 M34 95 q 6 -4 10 -2 M85 84 q -6 -4 -10 -2 M86 95 q -6 -4 -10 -2"
                  fill="none"
                  stroke={coat.deep}
                  strokeWidth={2.8}
                  strokeLinecap="round"
                  opacity={0.5}
                />
              )}

              {/* Front paws, cream like the reference. Each is its own joint,
                  pivoting at the top where it would hang from a shoulder, so it
                  can lift to the face to groom or be held out to wave. */}
              <g ref={pawL} className={`pj-${uid} pjt-${uid}`}>
                <ellipse cx={45} cy={110} rx={10} ry={6} fill={CREAM} />
                <path
                  d="M42 110.5 h 6"
                  stroke={coat.mid}
                  strokeWidth={1.4}
                  strokeLinecap="round"
                  opacity={0.5}
                />
              </g>
              <g ref={pawR} className={`pj-${uid} pjt-${uid}`}>
                <ellipse cx={75} cy={110} rx={10} ry={6} fill={CREAM} />
                <path
                  d="M72 110.5 h 6"
                  stroke={coat.mid}
                  strokeWidth={1.4}
                  strokeLinecap="round"
                  opacity={0.5}
                />
              </g>

              {/* Rim light along the lit edge. */}
              <path
                d="M26 90 C 27 74, 40 60, 57 58"
                fill="none"
                stroke="#fff"
                strokeOpacity={0.35}
                strokeWidth={2.4}
                strokeLinecap="round"
              />

              {has('ruff') && (
                <path
                  d="M40 70 q 8 12 20 12 q 12 0 20 -12"
                  fill="none"
                  stroke="#fff"
                  strokeWidth={6.5}
                  strokeLinecap="round"
                  opacity={0.9}
                />
              )}
              {/* Neck and body pieces sit on the torso, so they ride the
                  squash and stretch rather than floating over it. */}
              <PetAccessory id={worn.neck ?? null} g={g} />
              <PetAccessory id={worn.body ?? null} g={g} />
            </g>

            {/* Head. Its first child is the shadow it casts on the chest — the
                thing that makes the two shapes read as one animal. */}
            <g
              ref={head}
              className={`pj-${uid} pjb-${uid}`}
              style={{
                transform: curled
                  ? 'translate(3px, 26px) rotate(7deg) scale(0.9)'
                  : undefined,
                transition: ease,
              }}
            >
              <ellipse cx={60} cy={73} rx={27} ry={14} fill={`url(#${g('ao')})`} />

              <g ref={earL} className={`pj-${uid} pjb-${uid}`}>
                <path
                  d="M34 33 C 30 19, 30 10, 32 6 C 41 9, 51 16, 57 24 Z"
                  fill={coat.mid}
                />
                <path
                  d="M37 30 C 34 20, 34 14, 35 11 C 42 14, 48 19, 53 25 Z"
                  fill="#ffb3c8"
                />
              </g>
              <g ref={earR} className={`pj-${uid} pjb-${uid}`}>
                <path
                  d="M86 33 C 90 19, 90 10, 88 6 C 79 9, 69 16, 63 24 Z"
                  fill={coat.mid}
                />
                <path
                  d="M83 30 C 86 20, 86 14, 85 11 C 78 14, 72 19, 67 25 Z"
                  fill="#ffb3c8"
                />
              </g>

              {/* Fur rim, then the head itself. */}
              <path
                d={HEAD_D}
                fill="none"
                stroke={CREAM}
                strokeWidth={4}
                opacity={0.55}
                filter={`url(#${g('fur')})`}
              />
              <path d={HEAD_D} fill={`url(#${g('head')})`} />

              {/* Cream muzzle and cheeks. */}
              <ellipse cx={60} cy={58} rx={17} ry={11} fill={CREAM} opacity={0.95} />

              {has('markings') && (
                <path
                  d="M50 21 l 3 8 M60 18 l 0 8 M70 21 l -3 8 M43 30 l 4 5 M77 30 l -4 5"
                  stroke={coat.deep}
                  strokeWidth={2.8}
                  strokeLinecap="round"
                  opacity={0.45}
                />
              )}

              {/* Blush. The reference art has it and it is most of why the
                  face reads as warm rather than merely large-eyed. */}
              {has('cheeks') && (
                <>
                  <ellipse cx={38} cy={54} rx={7} ry={4.2} fill="#ff8fb0" opacity={0.4} />
                  <ellipse cx={82} cy={54} rx={7} ry={4.2} fill="#ff8fb0" opacity={0.4} />
                </>
              )}

              {/* Specular patch where the skull turns towards the light. */}
              <ellipse cx={48} cy={27} rx={15} ry={8} fill="#fff" opacity={0.32} />

              {has('whiskers') && (
                <g ref={whiskers} className={`pj-${uid} pjc-${uid}`} opacity={0.65}>
                  <path
                    d="M42 55 C 32 53, 25 50, 19 46 M42 59 C 31 60, 24 62, 17 64"
                    fill="none"
                    stroke={coat.deep}
                    strokeWidth={1.7}
                    strokeLinecap="round"
                  />
                  <path
                    d="M78 55 C 88 53, 95 50, 101 46 M78 59 C 89 60, 96 62, 103 64"
                    fill="none"
                    stroke={coat.deep}
                    strokeWidth={1.7}
                    strokeLinecap="round"
                  />
                </g>
              )}

              {has('eyes') && !curled ? (
                <>
                  <g ref={eyeL} className={`pj-${uid} pjc-${uid}`}>{eye(48)}</g>
                  <g ref={eyeR} className={`pj-${uid} pjc-${uid}`}>{eye(72)}</g>
                </>
              ) : (
                /* Closed eyes are arcs, not dots — a sleeping cat, not a blank
                   one. Curved downward, the way a contented cat squints. */
                <>
                  <g ref={eyeL} className={`pj-${uid} pjc-${uid}`}>
                    <path
                      d="M41 46 q 7 8 14 0"
                      fill="none"
                      stroke={DARK}
                      strokeWidth={2.8}
                      strokeLinecap="round"
                    />
                  </g>
                  <g ref={eyeR} className={`pj-${uid} pjc-${uid}`}>
                    <path
                      d="M65 46 q 7 8 14 0"
                      fill="none"
                      stroke={DARK}
                      strokeWidth={2.8}
                      strokeLinecap="round"
                    />
                  </g>
                </>
              )}

              <path d="M60 57 l -3.6 -3.8 h 7.2 Z" fill={NOSE} />
              <path
                d="M60 57.4 v 2.4 M60 59.8 q -3.8 3.4 -7 0 M60 59.8 q 3.8 3.4 7 0"
                fill="none"
                stroke={NOSE}
                strokeWidth={1.8}
                strokeLinecap="round"
                opacity={0.85}
              />

              {/*
                The streak flame, from the reference art. It lives *inside* the
                head group so it tracks the head through every animation — as a
                sibling it stayed put while the cat curled underneath it and
                read as a separate object floating in the card. Awake only: a
                sleeping cat with a flame over its head looks alarming rather
                than triumphant. `animate-breathe` is the app's existing 2.6s
                pulse, reused rather than a seventh keyframe nobody remembers.
              */}
              {has('flame') && !curled && (
                <g className="animate-breathe" style={{ transformOrigin: '60px 16px' }}>
                  <path
                    d="M61 -12 C 63 -4, 69 0, 71 6 C 74 13, 70 20, 60 20
                       C 51 20, 47 14, 49 7 C 50 3, 53 1, 55 -2
                       C 55.5 2, 57 4, 58.5 4.5 C 60 2, 60.5 -5, 61 -12 Z"
                    fill={`url(#${g('flame')})`}
                  />
                  <path
                    d="M61 -1 C 62 3, 65 5, 65.5 9 C 66 14, 63 17, 60 17
                       C 57 17, 55 14, 55.5 10 C 56 7, 58 5, 59 2
                       C 59.5 4, 60.5 4, 61 -1 Z"
                    fill="#fff"
                    opacity={0.6}
                  />
                </g>
              )}

              {/* Face pieces paint over the eyes; they belong to the head
                  directly, with no lag — glasses that trailed the face would
                  read as a rendering fault rather than as weight. */}
              <PetAccessory id={worn.face ?? null} g={g} />

              {/*
                Head pieces get their own joint. A hat settling a beat after the
                head is the detail that sells the leap, and `play()` skips a
                missing rig part, so this costs a bare-headed cat nothing.
              */}
              <g ref={hat} className={`pj-${uid} pjb-${uid}`}>
                <PetAccessory id={worn.head ?? null} g={g} />
              </g>
            </g>

          </g>
        </g>
      </g>
    </svg>
  )
})
