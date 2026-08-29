/**
 * Appearance preference.
 *
 * The app used to follow the phone and offer no way out, so anyone whose phone
 * sits in dark mode was stuck there. It now defaults to light and lets you
 * choose, because eye comfort is individual and dark is not universally kinder:
 * a dark ground dilates the pupil, which admits more optical aberration, which
 * makes bright glyphs halo for roughly half of adults.
 *
 * Kept in localStorage rather than the DataStore: it has to be readable
 * synchronously before first paint, and it belongs to the device rather than
 * the account — the same person may want light on a phone and dark on a laptop.
 */
export type ThemeChoice = 'light' | 'dark' | 'system'

export const THEME_KEY = 'memey-theme'
export const DEFAULT_THEME: ThemeChoice = 'light'

export const THEME_OPTIONS: { value: ThemeChoice; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

export function isThemeChoice(v: unknown): v is ThemeChoice {
  return v === 'light' || v === 'dark' || v === 'system'
}

export function readTheme(): ThemeChoice {
  if (typeof window === 'undefined') return DEFAULT_THEME
  try {
    const stored = window.localStorage.getItem(THEME_KEY)
    return isThemeChoice(stored) ? stored : DEFAULT_THEME
  } catch {
    // Private mode and blocked site data both throw rather than return null.
    return DEFAULT_THEME
  }
}

/** The theme actually in force, with 'system' resolved against the OS. */
export function resolveTheme(choice: ThemeChoice): 'light' | 'dark' {
  if (choice !== 'system') return choice
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Matches the --bg token per theme, so the notch and status bar agree. */
export const THEME_COLORS: Record<'light' | 'dark', string> = {
  light: '#faf6f8',
  dark: '#1a171b',
}

export function applyTheme(choice: ThemeChoice): void {
  const resolved = resolveTheme(choice)
  const root = document.documentElement
  // 'system' leaves the attribute off, so the prefers-color-scheme rules apply.
  if (choice === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', choice)

  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLORS[resolved])
}

export function writeTheme(choice: ThemeChoice): void {
  try {
    window.localStorage.setItem(THEME_KEY, choice)
  } catch {
    // Preference is lost on reload, but the current session still applies it.
  }
  applyTheme(choice)
}
