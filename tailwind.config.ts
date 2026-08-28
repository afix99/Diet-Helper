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
        avocado: 'rgb(var(--avocado) / <alpha-value>)',
        amber: 'rgb(var(--amber) / <alpha-value>)',
        clay: 'rgb(var(--clay) / <alpha-value>)',
        ocean: 'rgb(var(--ocean) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '1.25rem',
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
      },
      animation: {
        'pop-in': 'pop-in 320ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'slide-up': 'slide-up 240ms ease-out',
      },
    },
  },
  plugins: [],
}
export default config
