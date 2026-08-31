import type { Config } from 'tailwindcss'

/**
 * Colours are declared as CSS custom properties in globals.css so that light
 * and dark themes swap by redefining tokens, not by duplicating class lists.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        raised: 'rgb(var(--raised) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        faint: 'rgb(var(--faint) / <alpha-value>)',
        primary: 'rgb(var(--primary) / <alpha-value>)',
        'primary-ink': 'rgb(var(--primary-ink) / <alpha-value>)',
        'on-primary': 'rgb(var(--on-primary) / <alpha-value>)',
        'primary-container': 'rgb(var(--primary-container) / <alpha-value>)',
        avocado: 'rgb(var(--avocado) / <alpha-value>)',
        amber: 'rgb(var(--amber) / <alpha-value>)',
        clay: 'rgb(var(--clay) / <alpha-value>)',
        ocean: 'rgb(var(--ocean) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      /* The iOS type scale, in the points Apple specifies. */
      fontSize: {
        'large-title': ['34px', { lineHeight: '41px', letterSpacing: '-0.02em', fontWeight: '700' }],
        title: ['17px', { lineHeight: '22px', letterSpacing: '-0.01em', fontWeight: '600' }],
        body: ['17px', { lineHeight: '22px', letterSpacing: '-0.01em' }],
        secondary: ['15px', { lineHeight: '20px' }],
        tertiary: ['13px', { lineHeight: '18px' }],
        caption: ['11px', { lineHeight: '13px', fontWeight: '500' }],
      },
      borderRadius: {
        /* Larger radii approximate iOS continuous corners better than the
           Tailwind defaults. */
        card: '22px',
        sheet: '28px',
        /* Concentric: a control inside a 22px card padded by 12px wants 10-12px,
           not another 22. iOS derives child radii by subtracting the padding. */
        inner: '12px',
        pill: '999px',
      },
      boxShadow: {
        card: '0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px -12px rgb(0 0 0 / 0.12)',
        lift: '0 2px 4px rgb(0 0 0 / 0.06), 0 16px 40px -16px rgb(0 0 0 / 0.22)',
      },
      keyframes: {
        'pop-in': {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '60%': { transform: 'scale(1.03)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'slide-up': {
          from: { transform: 'translateY(8px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        /* A sheet arriving from the bottom edge, and leaving the same way.
           The overshoot curve lives in the timing function, not the frames,
           so the exit can reverse it exactly. */
        'sheet-in': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        'sheet-out': {
          from: { transform: 'translateY(0)' },
          to: { transform: 'translateY(100%)' },
        },
        'scrim-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'scrim-out': { from: { opacity: '1' }, to: { opacity: '0' } },
        /* Ripple from the point the finger landed. */
        ripple: {
          from: { transform: 'scale(0)', opacity: '0.5' },
          to: { transform: 'scale(1)', opacity: '0' },
        },
        /* A badge landing: overshoot, settle, with a rotational kick. */
        'badge-pop': {
          '0%': { transform: 'scale(0.4) rotate(-14deg)', opacity: '0' },
          '55%': { transform: 'scale(1.14) rotate(5deg)', opacity: '1' },
          '78%': { transform: 'scale(0.96) rotate(-2deg)' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        /* Glow ring that expands and fades behind a newly unlocked badge. */
        'badge-glow': {
          '0%': { transform: 'scale(0.7)', opacity: '0.55' },
          '100%': { transform: 'scale(1.9)', opacity: '0' },
        },
        /* Staggered list entry; the delay is set per item inline. */
        'rise-in': {
          from: { transform: 'translateY(10px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        /* Skeleton shimmer while data loads. */
        shimmer: {
          from: { backgroundPosition: '-200% 0' },
          to: { backgroundPosition: '200% 0' },
        },
        /* The ring acknowledging that a number under it just changed. Small on
           purpose: it sits behind the headline figure, and a big bounce there
           would fight the count-up rather than support it. */
        'ring-pulse': {
          '0%': { transform: 'scale(1)' },
          '35%': { transform: 'scale(1.035)' },
          '100%': { transform: 'scale(1)' },
        },
        /* A tint washing across a row that has just arrived, so the eye is led
           to the thing that appeared rather than having to hunt for it. */
        'land-flash': {
          '0%': { backgroundColor: 'rgb(var(--primary) / 0.16)' },
          '100%': { backgroundColor: 'rgb(var(--primary) / 0)' },
        },
        /* A chip handing itself over: it shrinks away as the entry it becomes
           pops in below. */
        'chip-commit': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.82)', opacity: '0' },
        },
        /*
         * One arrival per badge. A trophy that always lands the same way is a
         * notification; a trophy that lands like the thing it is for is a
         * reward. Down 5 kg drops with weight and bounces twice, Comeback
         * drifts back in from off-screen left, Two Weeks unfurls from its base.
         */
        /* first step */
        'won-first-step': {
          '0%': { transform: 'translateY(26px) scale(0.7)', opacity: '0' },
          '60%': { transform: 'translateY(-4px) scale(1.06)', opacity: '1' },
          '100%': { transform: 'translateY(0) scale(1)' },
        },
        /* three in a row */
        'won-three-in-a-row': {
          '0%': { transform: 'scale(0.5) rotate(-25deg)', opacity: '0' },
          '45%': { transform: 'scale(1.18) rotate(8deg)', opacity: '1' },
          '70%': { transform: 'scale(0.95) rotate(-4deg)' },
          '100%': { transform: 'scale(1) rotate(0)' },
        },
        /* full week */
        'won-full-week': {
          '0%': { transform: 'perspective(320px) rotateY(-95deg)', opacity: '0' },
          '100%': { transform: 'perspective(320px) rotateY(0)', opacity: '1' },
        },
        /* two weeks */
        'won-two-weeks': {
          '0%': { transform: 'scaleY(0.15) translateY(22px)', opacity: '0', transformOrigin: 'bottom' },
          '55%': { transform: 'scaleY(1.12) translateY(-3px)', opacity: '1' },
          '100%': { transform: 'scaleY(1) translateY(0)' },
        },
        /* thirty days */
        'won-thirty-days': {
          '0%': { transform: 'rotate(-200deg) scale(0.55)', opacity: '0' },
          '100%': { transform: 'rotate(0) scale(1)', opacity: '1' },
        },
        /* comeback */
        'won-comeback': {
          '0%': { transform: 'translateX(-44px) scale(0.8)', opacity: '0' },
          '55%': { transform: 'translateX(7px) scale(1.05)', opacity: '1' },
          '78%': { transform: 'translateX(-3px)' },
          '100%': { transform: 'translateX(0) scale(1)' },
        },
        /* omega squad */
        'won-omega-squad': {
          '0%': { transform: 'translateX(34px) rotate(18deg) scale(0.8)', opacity: '0' },
          '40%': { transform: 'translateX(-8px) rotate(-9deg) scale(1.05)', opacity: '1' },
          '70%': { transform: 'translateX(4px) rotate(5deg)' },
          '100%': { transform: 'translateX(0) rotate(0) scale(1)' },
        },
        /* protein power */
        'won-protein-power': {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '35%': { transform: 'scale(1.24)', opacity: '1' },
          '55%': { transform: 'scale(0.94)' },
          '75%': { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)' },
        },
        /* fibre friend */
        'won-fibre-friend': {
          '0%': { transform: 'rotate(-16deg) scale(0.7)', opacity: '0' },
          '50%': { transform: 'rotate(9deg) scale(1.08)', opacity: '1' },
          '75%': { transform: 'rotate(-5deg) scale(0.98)' },
          '100%': { transform: 'rotate(0) scale(1)' },
        },
        /* hydrated */
        'won-hydrated': {
          '0%': { transform: 'translateY(-30px) scale(0.75)', opacity: '0' },
          '55%': { transform: 'translateY(0) scale(1.14, 0.86)', opacity: '1' },
          '75%': { transform: 'scale(0.94, 1.08)' },
          '100%': { transform: 'scale(1)' },
        },
        /* disiplin */
        'won-disiplin': {
          '0%': { transform: 'scale(2.1)', opacity: '0' },
          '65%': { transform: 'scale(0.94)', opacity: '1' },
          '100%': { transform: 'scale(1)' },
        },
        /* explorer */
        'won-explorer': {
          '0%': { transform: 'translateX(-30px) scale(0.72) rotate(-30deg)', opacity: '0' },
          '50%': { transform: 'translateX(6px) scale(1.1) rotate(10deg)', opacity: '1' },
          '100%': { transform: 'translateX(0) scale(1) rotate(0)' },
        },
        /* well rounded */
        'won-well-rounded': {
          '0%': { transform: 'rotate(-90deg) scale(0.4)', opacity: '0' },
          '55%': { transform: 'rotate(14deg) scale(1.16)', opacity: '1' },
          '100%': { transform: 'rotate(0) scale(1)' },
        },
        /* home cook */
        'won-home-cook': {
          '0%': { transform: 'translateY(-22px) rotate(12deg) scale(0.8)', opacity: '0' },
          '45%': { transform: 'translateY(3px) rotate(-6deg) scale(1.06)', opacity: '1' },
          '72%': { transform: 'translateY(-2px) rotate(3deg)' },
          '100%': { transform: 'translateY(0) rotate(0) scale(1)' },
        },
        /* down 1kg */
        'won-down-1kg': {
          '0%': { transform: 'translateY(-34px) scale(0.85)', opacity: '0' },
          '60%': { transform: 'translateY(0) scale(1.05, 0.92)', opacity: '1' },
          '80%': { transform: 'scale(0.97, 1.04)' },
          '100%': { transform: 'scale(1)' },
        },
        /* down 3kg */
        'won-down-3kg': {
          '0%': { transform: 'translateY(-44px) rotate(-14deg) scale(0.85)', opacity: '0' },
          '58%': { transform: 'translateY(0) rotate(5deg) scale(1.07, 0.9)', opacity: '1' },
          '80%': { transform: 'rotate(-2deg) scale(0.96, 1.05)' },
          '100%': { transform: 'translateY(0) rotate(0) scale(1)' },
        },
        /* down 5kg */
        'won-down-5kg': {
          '0%': { transform: 'translateY(-56px) scale(0.9)', opacity: '0' },
          '52%': { transform: 'translateY(0) scale(1.12, 0.84)', opacity: '1' },
          '68%': { transform: 'translateY(-9px) scale(0.96, 1.06)' },
          '86%': { transform: 'translateY(0) scale(1.03, 0.98)' },
          '100%': { transform: 'scale(1)' },
        },
        /* goal reached */
        'won-goal-reached': {
          '0%': { transform: 'scale(0.3) rotate(-40deg)', opacity: '0' },
          '40%': { transform: 'scale(1.3) rotate(12deg)', opacity: '1' },
          '60%': { transform: 'scale(0.92) rotate(-7deg)' },
          '78%': { transform: 'scale(1.1) rotate(4deg)' },
          '100%': { transform: 'scale(1) rotate(0)' },
        },

        /* Slow breathing pulse, for the streak flame. */
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.12)' },
        },
      },
      animation: {
        'pop-in': 'pop-in 320ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'slide-up': 'slide-up 240ms ease-out',
        ripple: 'ripple 560ms cubic-bezier(0.22, 0.61, 0.36, 1) forwards',
        /* A spring-ish arrival: fast out of the gate, settling with a little
           weight. 280ms matches the hold in usePresence. */
        'sheet-in': 'sheet-in 340ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'sheet-out': 'sheet-out 260ms cubic-bezier(0.5, 0, 0.75, 0) both',
        'scrim-in': 'scrim-in 220ms ease-out both',
        'scrim-out': 'scrim-out 240ms ease-in both',
        'badge-pop': 'badge-pop 620ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'badge-glow': 'badge-glow 900ms ease-out forwards',
        'rise-in': 'rise-in 380ms cubic-bezier(0.22, 0.61, 0.36, 1) both',
        'ring-pulse': 'ring-pulse 420ms cubic-bezier(0.34, 1.4, 0.64, 1)',
        'land-flash': 'land-flash 900ms ease-out forwards',
        'chip-commit': 'chip-commit 220ms cubic-bezier(0.5, 0, 0.75, 0) forwards',
        'won-first-step': 'won-first-step 620ms cubic-bezier(0.34,1.56,0.64,1) both',
        'won-three-in-a-row': 'won-three-in-a-row 680ms cubic-bezier(0.34,1.56,0.64,1) both',
        'won-full-week': 'won-full-week 640ms cubic-bezier(0.22,1,0.36,1) both',
        'won-two-weeks': 'won-two-weeks 760ms cubic-bezier(0.22,1.2,0.36,1) both',
        'won-thirty-days': 'won-thirty-days 820ms cubic-bezier(0.22,1,0.36,1) both',
        'won-comeback': 'won-comeback 780ms cubic-bezier(0.22,1.1,0.36,1) both',
        'won-omega-squad': 'won-omega-squad 760ms cubic-bezier(0.36,0.9,0.4,1) both',
        'won-protein-power': 'won-protein-power 700ms cubic-bezier(0.3,1.4,0.5,1) both',
        'won-fibre-friend': 'won-fibre-friend 820ms cubic-bezier(0.34,1.3,0.64,1) both',
        'won-hydrated': 'won-hydrated 760ms cubic-bezier(0.3,1.4,0.5,1) both',
        'won-disiplin': 'won-disiplin 560ms cubic-bezier(0.22,1,0.36,1) both',
        'won-explorer': 'won-explorer 720ms cubic-bezier(0.34,1.4,0.64,1) both',
        'won-well-rounded': 'won-well-rounded 760ms cubic-bezier(0.34,1.5,0.64,1) both',
        'won-home-cook': 'won-home-cook 740ms cubic-bezier(0.3,1.3,0.5,1) both',
        'won-down-1kg': 'won-down-1kg 680ms cubic-bezier(0.4,1.3,0.5,1) both',
        'won-down-3kg': 'won-down-3kg 760ms cubic-bezier(0.4,1.3,0.5,1) both',
        'won-down-5kg': 'won-down-5kg 900ms cubic-bezier(0.36,1.1,0.4,1) both',
        'won-goal-reached': 'won-goal-reached 1000ms cubic-bezier(0.34,1.56,0.64,1) both',
        shimmer: 'shimmer 1.4s linear infinite',
        breathe: 'breathe 2.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
export default config
