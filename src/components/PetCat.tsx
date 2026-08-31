'use client'

import { forwardRef, useId, useImperativeHandle, useRef } from 'react'
import type { PetPart, PetPose, PetStage } from '@/lib/pet'
import type { Rig } from '@/lib/petMotion'

/**
 * The cat, as a rig rather than a picture.
 *
 * Every animated part is its own `<g>` with its own `transform-origin`, which
 * is the whole reason this is hand-drawn SVG and not an image: a tail can only
 * whip if the tail is a separate object that pivots at its base.
 *
 * `transform-box: fill-box` is load-bearing. Without it, SVG transform-origin
 * percentages resolve against the *viewport* rather than the element's own box,
 * so `50% 100%` on the tail would pivot around a point somewhere off in the
 * corner of the drawing and every rotation would swing the part across the
 * canvas. With it, each group pivots inside itself, which is what a joint is.
 *
 * **On the shading.** The first version was flat fills and it looked like a
 * sticker. What gives a drawing volume is one light direction held across every
 * part: a gradient from the upper left, a white rim along the lit edge, a
 * specular patch where the form turns towards the light, and — the one that
 * gets forgotten — ambient occlusion in the crevices. The soft arc under the
 * chin is doing more work than anything else here; without it the head reads as
 * a ball balanced on a body rather than as one animal, which is exactly how the
 * first draft failed.
 *
 * Gradient ids are per-instance via `useId`, because the sheet renders eight
 * cats in one document and duplicate ids silently cross-wire their paint.
 */

export interface PetCatHandle {
  /** The animated groups, by rig part name. */
  rig: () => Rig
}

const VIEW = 120

/* Light comes from the upper left; every value below is set against that. */
const LIT = '#ff9ec4'
const MID = '#ef5f96'
const DEEP = '#a82f60'
const EAR = '#c93f74'
const EAR_IN = '#ff9dc4'
const DARK = '#2a0f1e'
const PALE = '#ffd2e4'

export const PetCat = forwardRef<
  PetCatHandle,
  {
    stage: PetStage
    pose: PetPose
    size?: number
    className?: string
  }
>(function PetCat({ stage, pose, size = 104, className = '' }, ref) {
  const has = (part: PetPart) => stage.parts.includes(part)
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const g = (name: string) => `${name}-${uid}`

  const root = useRef<SVGGElement>(null)
  const hop = useRef<SVGGElement>(null)
  const body = useRef<SVGGElement>(null)
  const head = useRef<SVGGElement>(null)
  const earL = useRef<SVGGElement>(null)
  const earR = useRef<SVGGElement>(null)
  const eyeL = useRef<SVGGElement>(null)
  const eyeR = useRef<SVGGElement>(null)
  const whiskers = useRef<SVGGElement>(null)
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
      tailBase: tailBase.current,
      tailTip: tailTip.current,
      shadow: shadow.current,
    }),
  }))

  /*
   * Curled is a real pose, not a smaller sitting cat: the body flattens, the
   * head tucks down into it and the tail comes round the front. Held as a
   * transform on each group rather than as a second drawing, so the rig stays
   * one object and `wake` has something to animate away from.
   */
  const curled = pose === 'curled'
  const ease = 'transform 380ms cubic-bezier(0.22,1,0.36,1)'

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
          <stop offset="0" stopColor={LIT} />
          <stop offset="0.45" stopColor={MID} />
          <stop offset="1" stopColor={DEEP} />
        </linearGradient>
        <linearGradient id={g('head')} x1="0.14" y1="0" x2="0.44" y2="1">
          <stop offset="0" stopColor="#ffb3d2" />
          <stop offset="0.5" stopColor={MID} />
          <stop offset="1" stopColor="#b8386e" />
        </linearGradient>
        {/* The halo. Warm and low, so it survives the near-white card as well
            as the dark one — a cool bloom vanished entirely in light mode. */}
        <radialGradient id={g('bloom')} cx="50%" cy="44%" r="50%">
          <stop offset="0" stopColor="#ff5c9c" stopOpacity="0.3" />
          <stop offset="0.6" stopColor="#ff7cae" stopOpacity="0.12" />
          <stop offset="1" stopColor="#ff7cae" stopOpacity="0" />
        </radialGradient>
        {/* Ambient occlusion under the chin: the join, not a shape. */}
        <radialGradient id={g('ao')} cx="50%" cy="12%" r="70%">
          <stop offset="0" stopColor="#5c1c3a" stopOpacity="0.45" />
          <stop offset="1" stopColor="#5c1c3a" stopOpacity="0" />
        </radialGradient>
        <filter id={g('soft')} x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {/* One rule for every joint, so a new part cannot be added without one. */}
      <style>{`
        .pj-${uid} { transform-box: fill-box; }
        .pjc-${uid} { transform-origin: 50% 50%; }
        .pjb-${uid} { transform-origin: 50% 100%; }
      `}</style>

      <g ref={root} className={`pj-${uid} pjc-${uid}`}>
        <circle cx={60} cy={56} r={54} fill={`url(#${g('bloom')})`} />

        {/* Contact shadow. Stays on the floor while the cat leaves it. */}
        <g ref={shadow} className={`pj-${uid} pjc-${uid}`} style={{ opacity: 0.3 }}>
          <ellipse
            cx={60}
            cy={curled ? 112 : 114}
            rx={curled ? 32 : 27}
            ry={5}
            fill="#5c1c3a"
            filter={`url(#${g('soft')})`}
          />
        </g>

        {/* Stage size. Static and outside the rig, so it cannot fight `greet`
            and `tuck`, which animate `root`. */}
        <g transform={`translate(60 118) scale(${stage.scale}) translate(-60 -118)`}>
          {/*
            The hips. Everything that leaves the ground hangs off this, so the
            head and body travel together instead of drifting apart.
          */}
          <g ref={hop} className={`pj-${uid} pjb-${uid}`}>
            {/* Tail, behind the body, tapering base to tip. */}
            {has('tail') && (
              <g
                ref={tailBase}
                className={`pj-${uid} pjb-${uid}`}
                style={{
                  transform: curled ? 'rotate(62deg) translateY(4px)' : undefined,
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
                    strokeWidth={8}
                    strokeLinecap="round"
                  />
                  {has('markings') && (
                    <path
                      d="M104 68 l 5 -1.5 M99 59 l 5 -1.5"
                      stroke={DEEP}
                      strokeWidth={2.6}
                      strokeLinecap="round"
                      opacity={0.5}
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
                transform: curled ? 'translateY(6px) scale(1.12, 0.8)' : undefined,
                transition: ease,
              }}
            >
              <path
                d="M60 58 C 38 58, 25 76, 25 94 C 25 108, 41 115, 60 115
                   C 79 115, 95 108, 95 94 C 95 76, 82 58, 60 58 Z"
                fill={`url(#${g('body')})`}
              />
              <ellipse cx={44} cy={110} rx={10} ry={6} fill={`url(#${g('body')})`} />
              <ellipse cx={76} cy={110} rx={10} ry={6} fill={`url(#${g('body')})`} />
              {/* Rim light along the lit edge, and a soft belly highlight. */}
              <path
                d="M26 90 C 27 74, 40 60, 57 58"
                fill="none"
                stroke="#fff"
                strokeOpacity={0.3}
                strokeWidth={2.4}
                strokeLinecap="round"
              />
              <ellipse cx={50} cy={82} rx={15} ry={9} fill="#fff" opacity={0.13} />
              {has('markings') && (
                <path
                  d="M50 74 q 10 -5 20 0 M48 84 q 12 -5 24 0"
                  fill="none"
                  stroke={DEEP}
                  strokeWidth={2.6}
                  strokeLinecap="round"
                  opacity={0.32}
                />
              )}
              {has('ruff') && (
                <path
                  d="M40 72 q 8 11 20 11 q 12 0 20 -11"
                  fill="none"
                  stroke="#ffe3ef"
                  strokeWidth={6}
                  strokeLinecap="round"
                  opacity={0.75}
                />
              )}
              {has('collar') && (
                <>
                  <path
                    d="M42 70 q 18 12 36 0"
                    fill="none"
                    stroke="#4f9a63"
                    strokeWidth={5.5}
                    strokeLinecap="round"
                  />
                  <circle cx={60} cy={79} r={4} fill="#f2c94c" />
                  <circle cx={58.6} cy={77.6} r={1.2} fill="#fff" opacity={0.8} />
                </>
              )}
            </g>

            {/* Head. Its first child is the shadow it casts on the chest — the
                thing that makes the two shapes read as one animal. */}
            <g
              ref={head}
              className={`pj-${uid} pjb-${uid}`}
              style={{
                transform: curled
                  ? 'translate(10px, 22px) rotate(22deg) scale(0.95)'
                  : undefined,
                transition: ease,
              }}
            >
              <ellipse cx={60} cy={72} rx={27} ry={14} fill={`url(#${g('ao')})`} />

              <g ref={earL} className={`pj-${uid} pjb-${uid}`}>
                <path d="M35 33 C 31 20, 31 11, 33 7 C 41 10, 51 17, 57 25 Z" fill={EAR} />
                <path
                  d="M38 30 C 35 21, 35 15, 36 12 C 42 15, 48 20, 53 26 Z"
                  fill={EAR_IN}
                  opacity={0.9}
                />
              </g>
              <g ref={earR} className={`pj-${uid} pjb-${uid}`}>
                <path d="M85 33 C 89 20, 89 11, 87 7 C 79 10, 69 17, 63 25 Z" fill={EAR} />
                <path
                  d="M82 30 C 85 21, 85 15, 84 12 C 78 15, 72 20, 67 26 Z"
                  fill={EAR_IN}
                  opacity={0.9}
                />
              </g>

              <path
                d="M60 16 C 79 16, 92 29, 92 46 C 92 62, 78 72, 60 72
                   C 42 72, 28 62, 28 46 C 28 29, 41 16, 60 16 Z"
                fill={`url(#${g('head')})`}
              />
              {/* Rim light and the specular patch where the skull turns. */}
              <path
                d="M29 42 C 31 27, 44 17, 59 16"
                fill="none"
                stroke="#fff"
                strokeOpacity={0.5}
                strokeWidth={2.6}
                strokeLinecap="round"
              />
              <ellipse cx={49} cy={29} rx={16} ry={8.5} fill="#fff" opacity={0.3} />

              {has('markings') && (
                <path
                  d="M52 22 l 3 7 M60 20 l 0 7 M68 22 l -3 7"
                  stroke={DEEP}
                  strokeWidth={2.6}
                  strokeLinecap="round"
                  opacity={0.35}
                />
              )}

              {has('whiskers') && (
                <g ref={whiskers} className={`pj-${uid} pjc-${uid}`} opacity={0.85}>
                  <path
                    d="M40 52 C 32 51, 26 49, 21 46 M40 56 C 31 57, 25 58, 19 60"
                    fill="none"
                    stroke="#ffc2dc"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                  />
                  <path
                    d="M80 52 C 88 51, 94 49, 99 46 M80 56 C 89 57, 95 58, 101 60"
                    fill="none"
                    stroke="#ffc2dc"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                  />
                </g>
              )}

              {has('eyes') && !curled ? (
                <>
                  <g ref={eyeL} className={`pj-${uid} pjc-${uid}`}>
                    <ellipse cx={49} cy={47} rx={7.4} ry={8.7} fill={DARK} />
                    <ellipse cx={46.5} cy={43.8} rx={2.7} ry={3.1} fill="#fff" />
                    <ellipse cx={51.3} cy={50.8} rx={1.5} ry={1.2} fill="#fff" opacity={0.65} />
                  </g>
                  <g ref={eyeR} className={`pj-${uid} pjc-${uid}`}>
                    <ellipse cx={71} cy={47} rx={7.4} ry={8.7} fill={DARK} />
                    <ellipse cx={68.5} cy={43.8} rx={2.7} ry={3.1} fill="#fff" />
                    <ellipse cx={73.3} cy={50.8} rx={1.5} ry={1.2} fill="#fff" opacity={0.65} />
                  </g>
                </>
              ) : (
                /* Closed eyes are arcs, not dots — a sleeping cat, not a blank one. */
                <>
                  <g ref={eyeL} className={`pj-${uid} pjc-${uid}`}>
                    <path
                      d="M43 47 q 6 6 12 0"
                      fill="none"
                      stroke={DARK}
                      strokeWidth={2.6}
                      strokeLinecap="round"
                    />
                  </g>
                  <g ref={eyeR} className={`pj-${uid} pjc-${uid}`}>
                    <path
                      d="M65 47 q 6 6 12 0"
                      fill="none"
                      stroke={DARK}
                      strokeWidth={2.6}
                      strokeLinecap="round"
                    />
                  </g>
                </>
              )}

              <path d="M60 60 l -3.4 -3.6 h 6.8 Z" fill={PALE} />
              <path
                d="M60 60.4 v 2.2 M60 62.6 q -3.6 3.2 -6.6 0 M60 62.6 q 3.6 3.2 6.6 0"
                fill="none"
                stroke={PALE}
                strokeWidth={1.7}
                strokeLinecap="round"
                opacity={0.9}
              />
            </g>
          </g>
        </g>
      </g>
    </svg>
  )
})
