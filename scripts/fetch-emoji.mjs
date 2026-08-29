/**
 * Downloads Twemoji PNGs into public/emoji/.
 *
 * Twemoji is CC-BY 4.0, which permits redistribution with attribution — see
 * NOTICE at the repo root. The files are committed rather than fetched at
 * runtime: this is an offline-capable PWA, and a home-screen launch with no
 * signal still has to render its artwork.
 *
 * Run once after editing MANIFEST:  node scripts/fetch-emoji.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises'

const VERSION = '15.1.0'
const BASE = `https://cdn.jsdelivr.net/gh/jdecked/twemoji@${VERSION}/assets/72x72`

/** name → unicode codepoint(s), lower-case hex, dash-separated. */
const MANIFEST = {
  flame: '1f525',
  search: '1f50d',
  star: '2b50',
  salad: '1f957',
  clock: '1f550',
  bowl: '1f37d',
  mail: '1f4ec',
  phone: '1f4f2',
  scales: '2696',
  footprints: '1f463',
  calendar: '1f4c5',
  fish: '1f41f',
  muscle: '1f4aa',
  target: '1f3af',
  medal: '1f3c5',
  trophy: '1f3c6',
  weight: '2696',
  sparkles: '2728',
  droplet: '1f4a7',
  pill: '1f48a',
  fire2: '1f9e1',
}

const out = new URL('../public/emoji/', import.meta.url)
await mkdir(out, { recursive: true })

let failures = 0
for (const [name, code] of Object.entries(MANIFEST)) {
  const url = `${BASE}/${code}.png`
  const res = await fetch(url)
  if (!res.ok) {
    console.error(`FAIL ${name} (${code}) → ${res.status} ${url}`)
    failures += 1
    continue
  }
  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(new URL(`${name}.png`, out), buf)
  console.log(`  ${name.padEnd(12)} ${String(buf.length).padStart(6)} b`)
}

if (failures > 0) {
  // Fail loudly: a missing asset must not ship as a broken image.
  console.error(`\n${failures} asset(s) failed to download.`)
  process.exit(1)
}
console.log(`\n${Object.keys(MANIFEST).length} Twemoji assets written to public/emoji/`)
