'use client'

import { forwardRef, useImperativeHandle, useRef } from 'react'
import type { PetPose, PetStage } from '@/lib/pet'
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
 * Colours come from theme tokens so the cat reads in both themes — unlike
 * burstPalette.ts, which is deliberately literal because it paints to a canvas
 * rather than into the DOM.
 *
 * The parts drawn depend on the stage; `PET_STAGES` in pet.ts owns that list, so
 * a stage gaining a feature is a data change here, not a drawing change.
 */

export interface PetCatHandle {
  /** The animated groups, by rig part name. */
  rig: () => Rig
}

const VIEW = 120

export const PetCat = forwardRef<
  PetCatHandle,
  {
    stage: PetStage
    pose: PetPose
    size?: number
    className?: string
  }
>(function PetCat({ stage, pose, size = 104, className = '' }, ref) {
  const has = (part: Parameters<typeof stage.parts.includes>[0]) =>
    stage.parts.includes(part)

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
   * Curled is a real pose, not a smaller sitting cat: the body flattens and
   * slides down, the head tucks into it, and the tail wraps round the front.
   * Held here as a transform on each group rather than as a second drawing, so
   * the rig stays one object and the wake animation has something to animate
   * *from*.
   */
  const curled = pose === 'curled'

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
      {/*
        Every joint pivots inside its own box. Set once here rather than per
        element so a new part cannot be added without one.
      */}
      <style>{`
        .pj { transform-box: fill-box; }
        .pj-c  { transform-origin: 50% 50%; }
        .pj-b  { transform-origin: 50% 100%; }
        .pj-t  { transform-origin: 50% 0%; }
      `}</style>

      <g ref={root} className="pj pj-c">
        {/* Contact shadow. Widens on impact, shrinks as the cat leaves the
            ground — the cheapest way to give a drawing weight. */}
        <g ref={shadow} className="pj pj-c" style={{ opacity: 0.22 }}>
          <ellipse
            cx={60}
            cy={curled ? 100 : 102}
            rx={curled ? 30 : 25}
            ry={4.5}
            fill="rgb(var(--ink))"
          />
        </g>

        {/*
          The hips. Everything that leaves the ground hangs off this, so the
          head and body travel together instead of drifting apart — and the
          shadow above stays behind, on the floor where it belongs.
        */}
        <g ref={hop} className="pj pj-b">
        {/* Tail, behind the body. Two segments so the tip can trail the base. */}
        {has('tail') && (
          <g
            ref={tailBase}
            className="pj pj-b"
            style={{
              transform: curled ? 'rotate(58deg) translateY(6px)' : undefined,
              transition: 'transform 380ms cubic-bezier(0.22,1,0.36,1)',
            }}
          >
            <path
              d="M78 96 C 88 96, 92 88, 91 78"
              stroke="rgb(var(--primary))"
              strokeWidth={9}
              strokeLinecap="round"
              fill="none"
            />
            <g ref={tailTip} className="pj pj-b">
              <path
                d="M91 79 C 90 70, 86 64, 80 60"
                stroke="rgb(var(--primary))"
                strokeWidth={8}
                strokeLinecap="round"
                fill="none"
              />
              {has('markings') && (
                <path
                  d="M88 71 h 5 M85 65 h 5"
                  stroke="rgb(var(--primary-ink))"
                  strokeWidth={2.6}
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
          className="pj pj-b"
          style={{
            transform: curled ? 'translateY(7px) scale(1.1, 0.82)' : undefined,
            transition: 'transform 380ms cubic-bezier(0.22,1,0.36,1)',
          }}
        >
          <ellipse cx={60} cy={82} rx={24} ry={20} fill="rgb(var(--primary))" />
          {/* Front paws, tucked when curled. */}
          <ellipse cx={50} cy={98} rx={7.5} ry={4.5} fill="rgb(var(--primary))" />
          <ellipse cx={70} cy={98} rx={7.5} ry={4.5} fill="rgb(var(--primary))" />
          {has('markings') && (
            <path
              d="M52 68 q 8 -4 16 0 M50 75 q 10 -4 20 0"
              stroke="rgb(var(--primary-ink))"
              strokeWidth={2.4}
              strokeLinecap="round"
              fill="none"
              opacity={0.4}
            />
          )}
          {has('ruff') && (
            <path
              d="M43 74 q 6 8 17 8 q 11 0 17 -8"
              stroke="rgb(var(--surface))"
              strokeWidth={5}
              strokeLinecap="round"
              fill="none"
              opacity={0.85}
            />
          )}
          {has('collar') && (
            <>
              <path
                d="M45 68 q 15 9 30 0"
                stroke="rgb(var(--avocado))"
                strokeWidth={5}
                strokeLinecap="round"
                fill="none"
              />
              <circle cx={60} cy={74} r={3.6} fill="rgb(var(--amber))" />
            </>
          )}
        </g>

        {/* Head, with ears, eyes and whiskers riding along inside it. */}
        <g
          ref={head}
          className="pj pj-b"
          style={{
            transform: curled
              ? 'translate(9px, 20px) rotate(24deg) scale(0.96)'
              : undefined,
            transition: 'transform 380ms cubic-bezier(0.22,1,0.36,1)',
          }}
        >
          <g ref={earL} className="pj pj-b">
            <path d="M42 48 L 39 30 L 55 40 Z" fill="rgb(var(--primary))" />
            <path d="M44 45 L 42.5 35 L 51 41 Z" fill="rgb(var(--primary-ink))" opacity={0.45} />
          </g>
          <g ref={earR} className="pj pj-b">
            <path d="M78 48 L 81 30 L 65 40 Z" fill="rgb(var(--primary))" />
            <path d="M76 45 L 77.5 35 L 69 41 Z" fill="rgb(var(--primary-ink))" opacity={0.45} />
          </g>

          <ellipse cx={60} cy={52} rx={22} ry={19} fill="rgb(var(--primary))" />

          {has('markings') && (
            <path
              d="M54 36 l 3 6 M60 34 l 0 6 M66 36 l -3 6"
              stroke="rgb(var(--primary-ink))"
              strokeWidth={2.4}
              strokeLinecap="round"
              opacity={0.45}
            />
          )}

          {has('whiskers') && (
            <g ref={whiskers} className="pj pj-c" opacity={0.6}>
              <path
                d="M40 53 h -12 M40 58 h -11"
                stroke="rgb(var(--primary-ink))"
                strokeWidth={1.8}
                strokeLinecap="round"
              />
              <path
                d="M80 53 h 12 M80 58 h 11"
                stroke="rgb(var(--primary-ink))"
                strokeWidth={1.8}
                strokeLinecap="round"
              />
            </g>
          )}

          {has('eyes') && !curled ? (
            <>
              <g ref={eyeL} className="pj pj-c">
                <ellipse cx={52} cy={52} rx={3.4} ry={4.4} fill="rgb(var(--primary-ink))" />
              </g>
              <g ref={eyeR} className="pj pj-c">
                <ellipse cx={68} cy={52} rx={3.4} ry={4.4} fill="rgb(var(--primary-ink))" />
              </g>
            </>
          ) : (
            /* Closed eyes are arcs, not dots — a sleeping cat, not a blank one. */
            <>
              <g ref={eyeL} className="pj pj-c">
                <path
                  d="M48 52 q 4 4 8 0"
                  stroke="rgb(var(--primary-ink))"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  fill="none"
                />
              </g>
              <g ref={eyeR} className="pj pj-c">
                <path
                  d="M64 52 q 4 4 8 0"
                  stroke="rgb(var(--primary-ink))"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  fill="none"
                />
              </g>
            </>
          )}

          {/* Nose and mouth. */}
          <path
            d="M60 59 l -2.6 -2.6 h 5.2 Z"
            fill="rgb(var(--primary-ink))"
          />
          <path
            d="M60 59.5 v 2 M60 61.5 q -3 2.5 -5.5 0 M60 61.5 q 3 2.5 5.5 0"
            stroke="rgb(var(--primary-ink))"
            strokeWidth={1.6}
            strokeLinecap="round"
            fill="none"
            opacity={0.75}
          />
        </g>
        </g>
      </g>
    </svg>
  )
})
