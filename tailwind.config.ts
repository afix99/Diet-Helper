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
        shimmer: 'shimmer 1.4s linear infinite',
        breathe: 'breathe 2.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
export default config
