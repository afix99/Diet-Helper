/**
 * Fails if any emoji codepoint remains in the UI source.
 *
 * System emoji render differently on every device and can't follow the theme,
 * so the app uses downloaded Twemoji artwork for pictures and inline SVG for
 * chrome. This guards that decision from quietly eroding.
 */
import { readFileSync } from 'node:fs'
import { globSync } from 'node:fs'

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2300}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{2039}\u{203A}]/u
// Typographic characters that are text, not icons.
const ALLOWED = /[×–—·…‘’“”→≤≥±✓]/u

const files = globSync('src/**/*.{ts,tsx}', { cwd: process.cwd() })
let bad = 0
for (const file of files) {
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      // Comments may legitimately quote the source spreadsheet's own glyphs.
      const trimmed = line.trim()
      if (trimmed.startsWith('*') || trimmed.startsWith('//') || trimmed.startsWith('/*')) return
      for (const ch of line) {
        if (EMOJI.test(ch) && !ALLOWED.test(ch)) {
          console.error(`${file}:${i + 1}  ${ch}  ${line.trim().slice(0, 70)}`)
          bad += 1
        }
      }
    })
}
console.log(bad === 0 ? `No emoji in ${files.length} source files.` : `\n${bad} emoji remaining.`)
process.exit(bad === 0 ? 0 : 1)
