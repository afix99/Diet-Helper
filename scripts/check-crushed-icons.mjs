/**
 * Finds icons that flexbox has squeezed narrower than they asked to be.
 *
 * `<Icon size={16}>` renders `<svg width="16">`. On a flex item that width is
 * a *starting* size, not a floor — `flex-shrink` defaults to 1 — so a row that
 * runs short of space takes the space out of the icon, down to nothing. The
 * icon does not overflow, does not widen the page, and does not fail any of
 * the other checks here: it just quietly stops being drawn.
 *
 * That is how the badges card on Today lost its chevron at 320px. `Icon` now
 * carries `shrink-0`, and this is the check that would have caught it.
 *
 * Needs a real browser and a running build, because the whole point is
 * measured layout:
 *
 *   npm i -g playwright && npx playwright install chromium
 *   pnpm build && npx next start -p 4410
 *   BASE=http://localhost:4410 pnpm check:crushed
 *
 * Playwright is deliberately *not* a devDependency: Vercel installs those on
 * every deploy, and a browser download in the build step would cost minutes
 * for a check that only ever runs by hand. `pnpm test` covers the component
 * side of this in `src/lib/__tests__/icons.test.ts` with no browser at all.
 */
let chromium
try {
  ;({ chromium } = await import('playwright'))
} catch {
  console.error(
    'This check needs Playwright, which is not a dependency of this project.\n' +
    '  npm i -g playwright && npx playwright install chromium'
  )
  process.exit(2)
}

const BASE = process.env.BASE ?? 'http://localhost:3000'
const PATHS = (process.env.PATHS ?? '/,/progress,/week,/more,/more/badges,/more/settings,/more/supplements,/shop,/recipes,/foods').split(',')
const WIDTHS = [320, 360, 390, 412]

/**
 * A lived-in day: enough logged to draw every card, with a long custom food
 * name and a day well over target, because the rows that crush are the full
 * ones.
 */
const seed = () => {
  try {
    if (localStorage.getItem('crushed-seed')) return
    localStorage.setItem('crushed-seed', '1')
    localStorage.setItem('memey-onboarding', 'done')
    const iso = (o) => {
      const n = new Date()
      const d = new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()))
      d.setUTCDate(d.getUTCDate() + o)
      return d.toISOString().slice(0, 10)
    }
    const entries = []
    for (let i = 0; i < 20; i++) {
      entries.push({
        id: `e${i}`, date: iso(-i), slot: 'breakfast', foodId: null, recipeId: null,
        customName: 'Nasi lemak with extra sambal', servings: 1, notes: null,
        macros: { kcal: 1400, protein: 90, carbs: 220, fat: 88, fibre: 34 },
      })
    }
    localStorage.setItem('memey-diet-planner:v1', JSON.stringify({
      entries,
      activities: [{ id: 'a1', date: iso(0), exerciseId: null, customName: 'Walk', minutes: 40, kcal: 160 }],
      weights: [
        { id: 'w', date: iso(-1), weightKg: 60, waistCm: null, hipCm: null },
        { id: 'w2', date: iso(-14), weightKg: 62, waistCm: null, hipCm: null },
      ],
      targets: { kcal: 1500, protein: 90, carbs: 130, fat: 50, fibre: 25, waterMl: 2000 },
      water: {},
      profile: {
        id: 'local', displayName: null, sex: 'female', heightCm: 165, age: 28,
        startWeightKg: 62, goalWeightKg: 55, bodyFatPct: null, startDate: iso(-40),
        activityLevel: 'sedentary',
      },
      pet: { name: 'Comel', out: true, seenStage: 6, greeted: true },
    }))
  } catch {}
}

const scan = () => {
  const label = (el) => {
    const c = typeof el.className === 'string' ? el.className : (el.className?.baseVal ?? '')
    return el.tagName.toLowerCase() + (c ? '.' + c.trim().split(/\s+/).slice(0, 3).join('.') : '')
  }
  const out = []
  for (const svg of document.querySelectorAll('svg[width]')) {
    const want = parseFloat(svg.getAttribute('width'))
    if (!Number.isFinite(want)) continue
    const got = svg.getBoundingClientRect().width
    // Half a pixel of tolerance: sub-pixel layout rounding is not a bug.
    if (got >= want - 0.5) continue
    const p = svg.parentElement
    out.push(
      `${label(svg)} asked ${want}px, got ${got.toFixed(1)}px` +
      (p ? ` in ${label(p)} — "${(p.innerText ?? '').replace(/\s+/g, ' ').slice(0, 44)}"` : '')
    )
  }
  return out
}

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium',
})
let failures = 0
for (const path of PATHS) {
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, isMobile: true, hasTouch: true })
    await ctx.addInitScript(seed)
    const page = await ctx.newPage()
    await page.goto(BASE + path, { waitUntil: 'load' })
    await page.waitForFunction(() => !document.body.innerText.includes('Loading…'), null, { timeout: 20000 })
    await page.waitForTimeout(1000)
    const bad = await page.evaluate(scan)
    if (bad.length) {
      failures += bad.length
      console.log(`  x ${path} @${width}`)
      for (const line of bad) console.log(`      ${line}`)
    } else {
      console.log(`  ok ${path} @${width}`)
    }
    await ctx.close()
  }
}
await browser.close()

if (failures) {
  console.error(`\n${failures} crushed icon${failures === 1 ? '' : 's'}. Give it shrink-0, or min-w-0 to whatever is hogging the row.`)
  process.exit(1)
}
console.log('\nno crushed icons')
