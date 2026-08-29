/**
 * Contrast bands for the design tokens, enforced at build time.
 *
 * This is not a normal accessibility check. It asserts contrast stays inside a
 * BAND, with a ceiling as well as a floor, because the eye-strain complaint
 * that prompted the palette work was caused by too MUCH contrast, not too
 * little: dark body text at 16.9:1 is roughly the sRGB maximum, and maximal
 * negative polarity is what makes glyphs halo for the large share of adults
 * with astigmatism.
 *
 * A well-meaning "bump the contrast for accessibility" edit would silently undo
 * that, so the ceiling is the point. Raise a ceiling only with a reason.
 */
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8')

/** Pull one `--token: r g b;` set out of a block of CSS. */
function tokensIn(block) {
  const out = {}
  for (const [, name, triple] of block.matchAll(/--([\w-]+):\s*(\d+ \d+ \d+);/g)) {
    out[name] = triple.split(' ').map(Number)
  }
  return out
}

function blockAfter(marker) {
  const at = css.indexOf(marker)
  if (at === -1) throw new Error(`could not find CSS block: ${marker}`)
  const open = css.indexOf('{', at)
  let depth = 0
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++
    else if (css[i] === '}' && --depth === 0) return css.slice(open, i)
  }
  throw new Error(`unbalanced braces after ${marker}`)
}

const light = tokensIn(blockAfter('\n:root {'))
const darkMedia = tokensIn(blockAfter("  :root:not([data-theme='light']) {"))
const darkAttr = tokensIn(blockAfter(":root[data-theme='dark'] {"))

const rel = ([r, g, b]) => {
  const f = (c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
const ratio = (a, b) => {
  const [x, y] = [rel(a), rel(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

let failed = 0
const check = (theme, label, fg, bg, lo, hi, tokens) => {
  if (!tokens[fg] || !tokens[bg]) {
    console.log(`  ✗ ${theme} ${label}: missing token ${tokens[fg] ? bg : fg}`)
    failed++
    return
  }
  const r = ratio(tokens[fg], tokens[bg])
  const ok = r >= lo && r <= hi
  if (!ok) failed++
  const why = r > hi ? 'TOO HIGH — this is the halation ceiling' : 'too low'
  console.log(
    `  ${ok ? '✓' : '✗'} ${theme.padEnd(5)} ${label.padEnd(26)} ${r.toFixed(2).padStart(5)}:1` +
      `  band ${lo}–${hi}${ok ? '' : `  <-- ${why}`}`
  )
}

// [foreground, background, min, max]
const PAIRS_LIGHT = [
  ['ink', 'bg', 13, 18],
  ['ink', 'surface', 13, 19],
  ['ink', 'raised', 12, 18],
  ['muted', 'bg', 6, 9],
  ['faint', 'bg', 3, 6],
  ['primary-ink', 'bg', 4.5, 9],
  ['primary-ink', 'surface', 4.5, 9],
  ['on-primary', 'primary', 4.5, 9],
  ['on-primary', 'avocado', 4.5, 9],
  ['on-primary', 'amber', 4.5, 9],
  ['on-primary', 'clay', 4.5, 9],
  ['on-primary', 'ocean', 4.5, 9],
]

// Dark ceilings are tighter on purpose: 11–13.5 for body text, not "as high as
// possible". See the file header.
const PAIRS_DARK = [
  ['ink', 'bg', 11, 13.5],
  ['ink', 'surface', 10, 13.5],
  ['ink', 'raised', 8, 12],
  ['ink', 'primary-container', 7, 14],
  ['muted', 'bg', 6, 9],
  ['faint', 'bg', 3, 6],
  ['primary-ink', 'bg', 6, 11],
  ['primary-ink', 'surface', 4.5, 11],
  ['on-primary', 'primary', 4.5, 14],
  ['on-primary', 'avocado', 4.5, 14],
  ['on-primary', 'amber', 4.5, 14],
  ['on-primary', 'clay', 4.5, 14],
  ['on-primary', 'ocean', 4.5, 14],
]

console.log('Design token contrast bands\n')
for (const [fg, bg, lo, hi] of PAIRS_LIGHT) check('light', `${fg} / ${bg}`, fg, bg, lo, hi, light)
for (const [fg, bg, lo, hi] of PAIRS_DARK) check('dark', `${fg} / ${bg}`, fg, bg, lo, hi, darkMedia)

// The two dark blocks are duplicated because CSS cannot share a declaration
// list between a media query and an attribute selector. Nothing stops them
// drifting apart except this.
console.log('')
const names = new Set([...Object.keys(darkMedia), ...Object.keys(darkAttr)])
const drift = [...names].filter(
  (n) => String(darkMedia[n]) !== String(darkAttr[n])
)
if (drift.length) {
  console.log(`  ✗ the two dark token blocks disagree on: ${drift.join(', ')}`)
  failed++
} else {
  console.log(`  ✓ both dark token blocks agree (${names.size} tokens)`)
}

// Saturation sanity: the original bug was a dark accent MORE saturated than the
// light one, which is what made the pink buzz on a near-black ground.
const sat = ([r, g, b]) => {
  const [mx, mn] = [Math.max(r, g, b) / 255, Math.min(r, g, b) / 255]
  const l = (mx + mn) / 2
  if (mx === mn) return 0
  return ((mx - mn) / (l > 0.5 ? 2 - mx - mn : mx + mn)) * 100
}
const [sl, sd] = [sat(light.primary), sat(darkMedia.primary)]
const satOk = sd <= sl + 2
if (!satOk) failed++
console.log(
  `  ${satOk ? '✓' : '✗'} dark accent is not more saturated than light ` +
    `(light ${sl.toFixed(0)}%, dark ${sd.toFixed(0)}%)`
)

console.log(failed ? `\n${failed} FAILED` : '\nAll token contrast bands hold.')
process.exit(failed ? 1 : 0)
