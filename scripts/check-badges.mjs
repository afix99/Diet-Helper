/**
 * Badge artwork invariants, checked at build time.
 *
 * Two real bugs prompted this. The Twemoji manifest had `weight` and `scales`
 * pointing at the same codepoint (2696), so Down 1 kg and Down 5 kg were
 * literally the same picture; and `fire2` was 1f9e1, an orange heart filed
 * under a name that reads as a flame. Neither is the kind of thing a type
 * checker or a unit test notices — you have to look at the pixels.
 *
 *     node scripts/check-badges.mjs
 */
import { createHash } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'

const root = new URL('..', import.meta.url).pathname
const read = (p) => readFileSync(root + p)
const hash = (p) => createHash('md5').update(read(p)).digest('hex')

const fail = (msg) => {
  console.error(`  x ${msg}`)
  failures += 1
}
let failures = 0

// Badge ids, from the one place they are declared.
const nutrition = readFileSync(root + 'src/lib/nutrition.ts', 'utf8')
const ids = [...nutrition.matchAll(/^\s+id: '([a-z0-9_]+)',$/gm)].map((m) => m[1])

// Badge -> glyph, from the builder.
const builder = readFileSync(root + 'scripts/build-badges.py', 'utf8')
const glyphs = new Map(
  [...builder.matchAll(/^\s+"(\w+)": \("(\w+)"/gm)].map((m) => [m[1], m[2]])
)

if (ids.length === 0) fail('found no badge ids in nutrition.ts')
console.log(`  ${ids.length} badges declared`)

// 1. Every badge has artwork in both states.
for (const id of ids) {
  for (const suffix of ['', '-locked']) {
    const p = `public/badges/${id}${suffix}.png`
    if (!existsSync(root + p)) fail(`${id}: missing ${p}`)
  }
  if (!glyphs.has(id)) fail(`${id}: no glyph mapping in build-badges.py`)
}

// 2. No orphan artwork for a badge that no longer exists.
for (const id of glyphs.keys()) {
  if (!ids.includes(id)) fail(`build-badges.py builds "${id}", which is not a badge`)
}

// 3. No two badges may look the same. This is the one that would have caught
//    Down 1 kg and Down 5 kg sharing a balance scale.
const byGlyph = new Map()
for (const id of ids) {
  const glyph = glyphs.get(id)
  if (!glyph) continue
  const p = `public/emoji/${glyph}.png`
  if (!existsSync(root + p)) {
    fail(`${id}: glyph ${glyph} is not in public/emoji`)
    continue
  }
  const h = hash(p)
  if (byGlyph.has(h)) fail(`${id} and ${byGlyph.get(h)} use the same picture (${glyph})`)
  else byGlyph.set(h, id)
}

// 4. Unlocked and locked must differ, or the trophy case reads as all-won.
for (const id of ids) {
  const a = `public/badges/${id}.png`
  const b = `public/badges/${id}-locked.png`
  if (existsSync(root + a) && existsSync(root + b) && hash(a) === hash(b)) {
    fail(`${id}: locked and unlocked artwork are identical`)
  }
}

if (failures > 0) {
  console.error(`\n${failures} badge artwork problem(s).`)
  process.exit(1)
}
console.log('  every badge has distinct artwork in both states.')
