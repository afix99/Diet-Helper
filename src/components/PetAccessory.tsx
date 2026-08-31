'use client'

import type { AccessorySlot } from '@/lib/types'

/**
 * The wardrobe, drawn.
 *
 * Every piece is an SVG fragment on the cat's own 120 viewBox, in the cat's own
 * light: a gradient from the upper left, a rim on the lit edge, and a soft
 * occlusion where the piece meets fur. Drawn rather than imported because these
 * render *into the rig groups* — a hat inside the head group tilts when the
 * head tilts, wings inside the hips travel with the leap. A PNG hat would sit
 * still while the cat moved out from under it, which is exactly the mistake the
 * flame made before it was moved inside the head.
 *
 * Coordinates are fixed to the cat's anatomy rather than parameterised:
 *
 * - the head spans x 27–93, y 15–73, with ear tips at y 6;
 * - the eyes sit at (48, 47) and (72, 47);
 * - the collar line follows the arc from (42, 70) to (78, 70);
 * - the body spans x 25–95, y 58–115.
 *
 * Gradient ids are per-instance, for the same reason the cat's are: the
 * wardrobe sheet renders many previews in one document and duplicate ids
 * silently cross-wire their paint.
 */

const GOLD = { lit: '#ffe9a8', mid: '#f0c04a', deep: '#a97a14' }

/** The gradients every piece draws from. Emitted once per cat instance. */
export function AccessoryDefs({ gid }: { gid: (name: string) => string }) {
  const sheen = (id: string, lit: string, mid: string, deep: string) => (
    <linearGradient key={id} id={gid(id)} x1="0.1" y1="0" x2="0.5" y2="1">
      <stop offset="0" stopColor={lit} />
      <stop offset="0.45" stopColor={mid} />
      <stop offset="1" stopColor={deep} />
    </linearGradient>
  )
  return (
    <>
      {sheen('a-gold', GOLD.lit, GOLD.mid, GOLD.deep)}
      {sheen('a-red', '#ff9aa6', '#e8455e', '#9c1f36')}
      {sheen('a-blue', '#a9d8ff', '#4b8fe0', '#1f4a86')}
      {sheen('a-green', '#a9e8bd', '#3f9a5c', '#1e5c37')}
      {sheen('a-cream', '#ffffff', '#fff1de', '#e0c9ae')}
      {sheen('a-wood', '#f0d6a8', '#cfa165', '#8a6432')}
      {sheen('a-steel', '#ffffff', '#d3dde8', '#8494a6')}
      {sheen('a-plum', '#d9b6ff', '#8b5cd6', '#4a2a86')}
      {sheen('a-leaf', '#c8f0a8', '#6cbf4a', '#2f7524')}
      {/* The helmet bubble: light gathers at the top left and falls away. */}
      <radialGradient id={gid('a-glass')} cx="34%" cy="28%" r="76%">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
        <stop offset="0.5" stopColor="#bfe4ff" stopOpacity="0.2" />
        <stop offset="1" stopColor="#7fb4e8" stopOpacity="0.3" />
      </radialGradient>
      {/* Where a piece rests on fur. Without this everything looks stuck on. */}
      <radialGradient id={gid('a-ao')} cx="50%" cy="0%" r="100%">
        <stop offset="0" stopColor="#5c1c3a" stopOpacity="0.34" />
        <stop offset="1" stopColor="#5c1c3a" stopOpacity="0" />
      </radialGradient>
    </>
  )
}

/** A thin white stroke along the lit edge — the cheapest convincing highlight. */
const rim = (d: string, w = 1.4, o = 0.55) => (
  <path d={d} fill="none" stroke="#fff" strokeOpacity={o} strokeWidth={w} strokeLinecap="round" />
)

type PieceProps = { g: (name: string) => string }

/* --- head ---------------------------------------------------------------- */

const PartyHat = ({ g }: PieceProps) => (
  <g>
    <ellipse cx={60} cy={17} rx={15} ry={4} fill={`url(#${g('a-ao')})`} />
    <path d="M60 -8 L 75 17 L 45 17 Z" fill={`url(#${g('a-red')})`} />
    {/* Stripes follow the cone rather than the page, or it reads as a flat triangle. */}
    <path
      d="M54 3 L 66 3 M50 10 L 70 10"
      stroke="#fff"
      strokeOpacity={0.75}
      strokeWidth={2.4}
      strokeLinecap="round"
    />
    {rim('M60 -7 L 47 15', 1.6, 0.5)}
    <circle cx={60} cy={-9} r={3.6} fill={`url(#${g('a-cream')})`} />
  </g>
)

const Beanie = ({ g }: PieceProps) => (
  <g>
    <path
      d="M31 27 C 31 8, 44 -1, 60 -1 C 76 -1, 89 8, 89 27 Z"
      fill={`url(#${g('a-blue')})`}
    />
    {rim('M36 22 C 37 8, 47 2, 58 1', 2, 0.4)}
    {/* The folded brim: a band with its own shadow above it. */}
    <rect x={29} y={24} width={62} height={9} rx={4.5} fill={`url(#${g('a-blue')})`} />
    <rect x={29} y={24} width={62} height={3} rx={1.5} fill="#0d2c55" opacity={0.22} />
    {rim('M33 27.5 H 87', 1.4, 0.35)}
    <circle cx={60} cy={-4} r={5.5} fill={`url(#${g('a-cream')})`} />
  </g>
)

const Crown = ({ g }: PieceProps) => (
  <g>
    <ellipse cx={60} cy={19} rx={17} ry={4} fill={`url(#${g('a-ao')})`} />
    <path
      d="M42 20 L 42 4 L 51 12 L 60 0 L 69 12 L 78 4 L 78 20 Z"
      fill={`url(#${g('a-gold')})`}
    />
    <rect x={42} y={16} width={36} height={5} rx={2.5} fill={GOLD.mid} />
    {rim('M44 18 H 76', 1.2, 0.5)}
    <circle cx={60} cy={4} r={2.4} fill="#ff5c8a" />
    <circle cx={49} cy={14} r={1.7} fill="#5cc9ff" />
    <circle cx={71} cy={14} r={1.7} fill="#5cc9ff" />
  </g>
)

const GoldenCrown = ({ g }: PieceProps) => (
  <g>
    <ellipse cx={60} cy={21} rx={20} ry={4.5} fill={`url(#${g('a-ao')})`} />
    <path
      d="M38 22 L 38 0 L 49 11 L 60 -6 L 71 11 L 82 0 L 82 22 Z"
      fill={`url(#${g('a-gold')})`}
    />
    <rect x={38} y={16} width={44} height={7} rx={3.5} fill={GOLD.mid} />
    <path d="M40 19.5 H 80" stroke={GOLD.deep} strokeWidth={1} opacity={0.5} />
    {rim('M40 18 H 78', 1.4, 0.6)}
    {/* Jewels, biggest at the centre — the eye goes where the value is. */}
    <circle cx={60} cy={-2} r={3.2} fill="#ff3e6e" />
    <circle cx={59.2} cy={-3} r={1.1} fill="#fff" opacity={0.8} />
    <circle cx={47} cy={13} r={2.2} fill="#3ec9ff" />
    <circle cx={73} cy={13} r={2.2} fill="#3ec9ff" />
    <circle cx={60} cy={19.5} r={2.4} fill="#7cff9e" />
  </g>
)

const Sweatband = ({ g }: PieceProps) => (
  <g>
    <rect x={28} y={22} width={64} height={10} rx={5} fill={`url(#${g('a-cream')})`} />
    <rect x={28} y={25.5} width={64} height={3.4} rx={1.7} fill="#e8455e" opacity={0.85} />
    {rim('M32 25 H 88', 1.3, 0.7)}
  </g>
)

const Sprout = ({ g }: PieceProps) => (
  <g>
    <path
      d="M60 18 C 60 8, 60 2, 60 -4"
      fill="none"
      stroke="#4f9c3a"
      strokeWidth={2.6}
      strokeLinecap="round"
    />
    <path d="M60 4 C 52 4, 47 -1, 46 -7 C 54 -7, 59 -3, 60 4 Z" fill={`url(#${g('a-leaf')})`} />
    <path d="M60 0 C 68 0, 73 -5, 74 -11 C 66 -11, 61 -7, 60 0 Z" fill={`url(#${g('a-leaf')})`} />
    {rim('M52 -4 C 55 -3, 58 -1, 59 2', 1, 0.5)}
  </g>
)

const ExplorerCap = ({ g }: PieceProps) => (
  <g>
    <ellipse cx={60} cy={22} rx={18} ry={4} fill={`url(#${g('a-ao')})`} />
    {/* Brim first, so the dome overlaps it and the two read as one object. */}
    <ellipse cx={60} cy={22} rx={35} ry={7} fill="#8a6f3f" />
    <ellipse cx={60} cy={20.6} rx={35} ry={7} fill={`url(#${g('a-wood')})`} />
    <path d="M34 8 C 34 -3, 45 -8, 60 -8 C 75 -8, 86 -3, 86 8 Z" fill={`url(#${g('a-wood')})`} />
    <rect x={33} y={7} width={54} height={9} rx={4} fill="#6f5426" />
    <rect x={33} y={7} width={54} height={3} rx={1.5} fill="#000" opacity={0.15} />
    {rim('M40 4 C 42 -3, 50 -6, 58 -6.5', 1.8, 0.4)}
  </g>
)

const FlowerCrown = ({ g }: PieceProps) => {
  const flower = (cx: number, cy: number, r: number, fill: string) => (
    <g key={`${cx}-${cy}`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse
          key={a}
          cx={cx}
          cy={cy - r}
          rx={r * 0.55}
          ry={r * 0.8}
          fill={fill}
          transform={`rotate(${a} ${cx} ${cy})`}
        />
      ))}
      <circle cx={cx} cy={cy} r={r * 0.5} fill={GOLD.mid} />
    </g>
  )
  return (
    <g>
      <path
        d="M33 22 C 40 8, 80 8, 87 22"
        fill="none"
        stroke="#5f9e46"
        strokeWidth={2.6}
        strokeLinecap="round"
      />
      {flower(38, 18, 4.4, '#ffd0e2')}
      {flower(50, 11, 5, '#fff0b0')}
      {flower(62, 9, 5.4, `url(#${g('a-cream')})`)}
      {flower(74, 12, 4.8, '#d6c4ff')}
      {flower(84, 19, 4.2, '#ffd0e2')}
    </g>
  )
}

const ChefHat = ({ g }: PieceProps) => (
  <g>
    <ellipse cx={60} cy={21} rx={17} ry={4} fill={`url(#${g('a-ao')})`} />
    {/*
      Three puffs, biggest in the middle. Sized so nothing rises above y = -11:
      an earlier, taller toque cleared the top of its card and read as a white
      brick floating over the cat rather than as a hat.
    */}
    <circle cx={46} cy={7} r={10} fill={`url(#${g('a-cream')})`} />
    <circle cx={74} cy={7} r={10} fill={`url(#${g('a-cream')})`} />
    <circle cx={60} cy={1} r={11.5} fill={`url(#${g('a-cream')})`} />
    <path d="M41 8 H 79 V 20 H 41 Z" fill={`url(#${g('a-cream')})`} />
    <rect x={40} y={13} width={40} height={8} rx={3} fill="#f2e2cd" />
    <path d="M40 13 H 80" stroke="#d8c3a6" strokeWidth={1} opacity={0.7} />
    {rim('M39 6 C 41 -1, 48 -6, 55 -7', 2, 0.8)}
  </g>
)

const StarClip = ({ g }: PieceProps) => (
  <g>
    <path
      d="m82 16 3.2 6.6 7.2 1-5.2 5 1.3 7.2-6.5-3.4-6.5 3.4 1.3-7.2-5.2-5 7.2-1z"
      fill={`url(#${g('a-gold')})`}
      stroke={GOLD.deep}
      strokeWidth={0.9}
    />
    <circle cx={80} cy={22} r={1.4} fill="#fff" opacity={0.85} />
  </g>
)

/* --- face ---------------------------------------------------------------- */

const Glasses = ({ g }: PieceProps) => (
  <g>
    <circle cx={48} cy={47} r={11} fill="#fff" opacity={0.12} />
    <circle cx={72} cy={47} r={11} fill="#fff" opacity={0.12} />
    <circle cx={48} cy={47} r={11} fill="none" stroke={`url(#${g('a-gold')})`} strokeWidth={2.2} />
    <circle cx={72} cy={47} r={11} fill="none" stroke={`url(#${g('a-gold')})`} strokeWidth={2.2} />
    <path
      d="M59 46 h 2 M37 44 L 28 41 M83 44 L 92 41"
      fill="none"
      stroke={`url(#${g('a-gold')})`}
      strokeWidth={2}
      strokeLinecap="round"
    />
    {rim('M42 41 A 11 11 0 0 1 50 37', 1.4, 0.85)}
    {rim('M66 41 A 11 11 0 0 1 74 37', 1.4, 0.85)}
  </g>
)

const Sunglasses = ({ g }: PieceProps) => (
  <g>
    <path
      d="M35 40 h 22 a 3 3 0 0 1 3 3 v 3 a 12 12 0 0 1 -24 0 v -3 a 3 3 0 0 1 -1 -3 Z"
      fill="#2a2030"
    />
    <path
      d="M63 40 h 22 a 3 3 0 0 1 -1 3 v 3 a 12 12 0 0 1 -24 0 v -3 a 3 3 0 0 1 3 -3 Z"
      fill="#2a2030"
    />
    <path d="M57 44 h 6" stroke="#2a2030" strokeWidth={3} strokeLinecap="round" />
    <path
      d="M35 41 L 27 39 M85 41 L 93 39"
      stroke="#2a2030"
      strokeWidth={2.4}
      strokeLinecap="round"
    />
    {rim('M40 44 L 46 51', 2.4, 0.4)}
    {rim('M68 44 L 74 51', 2.4, 0.4)}
    <ellipse cx={48} cy={43} rx={9} ry={2.2} fill={`url(#${g('a-steel')})`} opacity={0.25} />
    <ellipse cx={72} cy={43} rx={9} ry={2.2} fill={`url(#${g('a-steel')})`} opacity={0.25} />
  </g>
)

const Snorkel = ({ g }: PieceProps) => (
  <g>
    {/* Tube up the left side, then the mask over both eyes as one lens. */}
    <path
      d="M30 52 C 24 48, 24 34, 27 24"
      fill="none"
      stroke={`url(#${g('a-blue')})`}
      strokeWidth={4.6}
      strokeLinecap="round"
    />
    <circle cx={27} cy={23} r={3} fill="#ffb03a" />
    <path
      d="M34 38 h 52 a 4 4 0 0 1 4 4 v 9 a 8 8 0 0 1 -8 8 H 38 a 8 8 0 0 1 -8 -8 v -9 a 4 4 0 0 1 4 -4 Z"
      fill={`url(#${g('a-glass')})`}
      stroke="#3f7fc4"
      strokeWidth={2.4}
    />
    {rim('M37 42 h 16', 2.6, 0.75)}
  </g>
)

const SpaceHelmet = ({ g }: PieceProps) => (
  <g>
    {/* Drawn over the face, but mostly transparent, so the cat stays the subject. */}
    <circle cx={60} cy={42} r={40} fill={`url(#${g('a-glass')})`} />
    <circle cx={60} cy={42} r={40} fill="none" stroke="#cfe6ff" strokeWidth={2} opacity={0.8} />
    <path
      d="M60 82 a 40 40 0 0 0 40 -40"
      fill="none"
      stroke={`url(#${g('a-steel')})`}
      strokeWidth={5}
      strokeLinecap="round"
    />
    <rect x={26} y={72} width={68} height={9} rx={4.5} fill={`url(#${g('a-steel')})`} />
    {rim('M34 26 A 40 40 0 0 1 52 8', 3.4, 0.85)}
    {rim('M30 36 A 40 40 0 0 1 36 24', 2, 0.5)}
  </g>
)

/* --- neck ---------------------------------------------------------------- */

/**
 * The collar the cat used to wear as a stage feature.
 *
 * It moved out of `PET_STAGES` and into the wardrobe because a permanent collar
 * would have occupied the neck slot forever and made every other neck item
 * undrawable. Stage 5 took cheeks in its place.
 */
const BellCollar = ({ g }: PieceProps) => (
  <g>
    <path
      d="M42 70 q 18 12 36 0"
      fill="none"
      stroke="#3f9a5c"
      strokeWidth={6}
      strokeLinecap="round"
    />
    {rim('M43 69 q 17 11 34 0', 1.6, 0.55)}
    <circle cx={60} cy={80} r={4.4} fill={GOLD.deep} />
    <circle cx={60} cy={79.4} r={3.6} fill={`url(#${g('a-gold')})`} />
    <path d="M57.4 80.6 h 5.2" stroke="#b8801c" strokeWidth={1.2} strokeLinecap="round" />
    <circle cx={58.6} cy={78} r={0.9} fill="#fff" opacity={0.9} />
  </g>
)

const BowTie = ({ g }: PieceProps) => (
  <g>
    <path d="M60 76 L 44 69 v 14 Z" fill={`url(#${g('a-red')})`} />
    <path d="M60 76 L 76 69 v 14 Z" fill={`url(#${g('a-red')})`} />
    <rect x={56} y={72} width={8} height={8} rx={3} fill="#c22a44" />
    {rim('M47 71 L 57 75', 1.4, 0.6)}
    {rim('M73 71 L 63 75', 1.4, 0.6)}
  </g>
)

const Bandana = ({ g }: PieceProps) => (
  <g>
    <path d="M40 70 q 20 13 40 0 l -20 26 Z" fill={`url(#${g('a-red')})`} />
    <path
      d="M40 70 q 20 13 40 0"
      fill="none"
      stroke="#c22a44"
      strokeWidth={5}
      strokeLinecap="round"
    />
    {/* Paisley dots, small enough to survive at 40px. */}
    <circle cx={54} cy={82} r={1.7} fill="#fff" opacity={0.75} />
    <circle cx={64} cy={80} r={1.7} fill="#fff" opacity={0.75} />
    <circle cx={59} cy={89} r={1.7} fill="#fff" opacity={0.75} />
    {rim('M43 71 q 8 5 14 6', 1.4, 0.5)}
  </g>
)

const FishCharm = ({ g }: PieceProps) => (
  <g>
    <path
      d="M44 70 q 16 11 32 0"
      fill="none"
      stroke="#7b5c8f"
      strokeWidth={2.4}
      strokeLinecap="round"
    />
    <ellipse cx={60} cy={82} rx={7.5} ry={4.6} fill={`url(#${g('a-steel')})`} />
    <path d="M67 82 l 5 -3.4 v 6.8 Z" fill={`url(#${g('a-steel')})`} />
    <circle cx={56} cy={80.6} r={1.1} fill="#2a1420" />
    {rim('M54 79 q 5 -2 9 0', 1.2, 0.85)}
  </g>
)

const Scarf = ({ g }: PieceProps) => (
  <g>
    <path
      d="M39 68 q 21 15 42 0 l 2 7 q -23 16 -46 0 Z"
      fill={`url(#${g('a-plum')})`}
    />
    {/* One trailing end, hanging with a little weight in it. */}
    <path d="M73 76 q 7 9 4 20 l -9 2 q 3 -12 -2 -19 Z" fill={`url(#${g('a-plum')})`} />
    <path
      d="M69 88 h 9 M68 94 h 9"
      stroke="#fff"
      strokeOpacity={0.35}
      strokeWidth={1.6}
      strokeLinecap="round"
    />
    {rim('M42 70 q 8 6 15 7', 1.6, 0.45)}
  </g>
)

/* --- body ---------------------------------------------------------------- */

const Apron = ({ g }: PieceProps) => (
  <g>
    <path
      d="M52 72 L 60 78 L 68 72"
      fill="none"
      stroke="#9fb4c8"
      strokeWidth={2}
      strokeLinecap="round"
    />
    {/* A tint and an outline: pure cream vanished against the cream belly. */}
    <path
      d="M48 79 q 12 -6 24 0 l 6 25 q -18 7 -36 0 Z"
      fill="#dfe9f2"
      stroke="#9fb4c8"
      strokeWidth={1.4}
    />
    <rect x={52} y={88} width={16} height={11} rx={2} fill="#c9d9e8" />
    <path d="M52 88 h 16" stroke="#9fb4c8" strokeWidth={1.2} />
    {rim('M51 82 q 9 -4 18 0', 1.6, 0.9)}
  </g>
)

const Satchel = ({ g }: PieceProps) => (
  <g>
    <path
      d="M44 70 L 76 96"
      fill="none"
      stroke="#8a6f3f"
      strokeWidth={4}
      strokeLinecap="round"
    />
    <rect x={70} y={92} width={17} height={14} rx={3} fill={`url(#${g('a-wood')})`} />
    <path d="M70 96 h 17" stroke="#6f5426" strokeWidth={2.6} />
    <rect x={76} y={94} width={5} height={4} rx={1} fill={GOLD.mid} />
    {rim('M72 94 h 12', 1.2, 0.5)}
  </g>
)

/* --- back ---------------------------------------------------------------- */

/*
 * Back pieces are drawn behind an opaque body that spans x 25–95, so anything
 * narrower than that is invisible — the first cut of every one of these was a
 * shape nobody could see. They all now flare well past the silhouette on both
 * sides, which is also what a cape actually does.
 */
const Cape = ({ g }: PieceProps) => (
  <g>
    <path
      d="M42 70 q 18 12 36 0 L 106 116 q -46 11 -92 0 Z"
      fill={`url(#${g('a-red')})`}
    />
    {/* Folds: creases give the cloth a direction to fall in. */}
    <path
      d="M48 80 L 30 112 M60 84 L 60 116 M72 80 L 90 112"
      stroke="#8f1c31"
      strokeWidth={1.8}
      opacity={0.4}
    />
    {rim('M44 74 L 22 110', 2, 0.3)}
  </g>
)

const RoyalCape = ({ g }: PieceProps) => (
  <g>
    <path
      d="M40 68 q 20 13 40 0 L 112 118 q -52 11 -104 0 Z"
      fill={`url(#${g('a-plum')})`}
    />
    <path
      d="M48 78 L 26 114 M60 82 L 60 118 M72 78 L 94 114"
      stroke="#3b2070"
      strokeWidth={1.8}
      opacity={0.4}
    />
    {/* The ermine trim along the hem, which is what makes it read as royal
        rather than as a cloak — and it falls outside the body, so it shows. */}
    <path d="M10 112 q 50 12 102 0 l 2 8 q -52 12 -106 0 Z" fill={`url(#${g('a-cream')})`} />
    <path
      d="M26 116 v 4 M44 119 v 4 M62 120 v 4 M80 119 v 4 M98 116 v 4"
      stroke="#2a1420"
      strokeWidth={1.8}
      strokeLinecap="round"
      opacity={0.6}
    />
    {rim('M43 71 q 9 6 16 7', 1.6, 0.7)}
  </g>
)

const Wings = ({ g }: PieceProps) => (
  <g opacity={0.9}>
    {[-1, 1].map((s) => (
      <g key={s} transform={s === 1 ? undefined : 'translate(120 0) scale(-1 1)'}>
        <path
          d="M72 78 C 92 52, 114 54, 117 68 C 119 82, 100 88, 74 86 Z"
          fill={`url(#${g('a-plum')})`}
        />
        <path
          d="M74 88 C 96 88, 110 96, 107 106 C 104 115, 86 110, 74 96 Z"
          fill={`url(#${g('a-plum')})`}
        />
        <circle cx={102} cy={69} r={3.6} fill="#fff" opacity={0.6} />
        <circle cx={96} cy={99} r={2.6} fill="#fff" opacity={0.6} />
        {rim('M112 58 C 116 64, 117 74, 112 80', 1.4, 0.5)}
      </g>
    ))}
  </g>
)

const AngelWings = ({ g }: PieceProps) => (
  <g>
    {[-1, 1].map((s) => (
      <g key={s} transform={s === 1 ? undefined : 'translate(120 0) scale(-1 1)'}>
        <path
          d="M70 86 C 86 82, 104 66, 110 48 C 118 62, 114 92, 94 102 C 82 108, 72 98, 70 86 Z"
          fill={`url(#${g('a-cream')})`}
        />
        {/* Feather separations, curving with the wing rather than straight. */}
        <path
          d="M104 58 C 98 72, 90 84, 79 92 M108 72 C 102 84, 94 92, 85 98"
          fill="none"
          stroke="#dcc9b4"
          strokeWidth={1.4}
          opacity={0.85}
        />
        {rim('M108 54 C 113 66, 112 84, 103 95', 1.8, 0.9)}
      </g>
    ))}
  </g>
)

const Jetpack = ({ g }: PieceProps) => (
  <g>
    {[-1, 1].map((s) => (
      <g key={s} transform={s === 1 ? undefined : 'translate(120 0) scale(-1 1)'}>
        <rect x={95} y={64} width={14} height={32} rx={7} fill={`url(#${g('a-steel')})`} />
        <rect x={97} y={60} width={10} height={6} rx={3} fill="#ff8a3a" />
        {rim('M98.5 70 v 20', 1.8, 0.9)}
        {/* Thrust, warm at the tip and pale at the core. */}
        <path
          d="M102 96 C 107 102, 106 113, 102 118 C 98 113, 97 102, 102 96 Z"
          fill="#ffb03a"
          opacity={0.9}
        />
        <path
          d="M102 100 C 104.5 105, 104 110, 102 114 C 100 110, 99.5 105, 102 100 Z"
          fill="#fff6d0"
        />
      </g>
    ))}
  </g>
)

const Spoon = ({ g }: PieceProps) => (
  <g>
    <path
      d="M98 108 L 106 60"
      fill="none"
      stroke={`url(#${g('a-wood')})`}
      strokeWidth={4.6}
      strokeLinecap="round"
    />
    <ellipse
      cx={107}
      cy={53}
      rx={7}
      ry={9}
      fill={`url(#${g('a-wood')})`}
      transform="rotate(12 107 53)"
    />
    <ellipse cx={107} cy={53} rx={4.2} ry={5.8} fill="#b98d55" transform="rotate(12 107 53)" />
    {rim('M104 47 q 4 1 5 5', 1.2, 0.6)}
  </g>
)

const PIECES: Record<string, (p: PieceProps) => React.ReactElement> = {
  party_hat: PartyHat,
  beanie: Beanie,
  crown: Crown,
  golden_crown: GoldenCrown,
  sweatband: Sweatband,
  sprout: Sprout,
  explorer_cap: ExplorerCap,
  flower_crown: FlowerCrown,
  chef_hat: ChefHat,
  star_clip: StarClip,
  glasses: Glasses,
  sunglasses: Sunglasses,
  snorkel: Snorkel,
  space_helmet: SpaceHelmet,
  bell_collar: BellCollar,
  bow_tie: BowTie,
  bandana: Bandana,
  fish_charm: FishCharm,
  scarf: Scarf,
  apron: Apron,
  satchel: Satchel,
  cape: Cape,
  royal_cape: RoyalCape,
  wings: Wings,
  angel_wings: AngelWings,
  jetpack: Jetpack,
  spoon: Spoon,
}

/** Every id this file can draw — the wardrobe test checks the catalogue against it. */
export const DRAWN_PIECES: readonly string[] = Object.keys(PIECES)

/**
 * One worn piece. Renders nothing for an id it cannot draw, which is what keeps
 * a catalogue entry from crashing the cat while its art is still being made.
 */
export function PetAccessory({ id, g }: { id: string | null; g: (name: string) => string }) {
  if (!id) return null
  const Piece = PIECES[id]
  return Piece ? <Piece g={g} /> : null
}

/** The pieces worn in a set of slots, in the order they should paint. */
export function PetAccessories({
  worn,
  slots,
  g,
}: {
  worn: Partial<Record<AccessorySlot, string | null>>
  slots: readonly AccessorySlot[]
  g: (name: string) => string
}) {
  return (
    <>
      {slots.map((slot) => (
        <PetAccessory key={slot} id={worn[slot] ?? null} g={g} />
      ))}
    </>
  )
}
