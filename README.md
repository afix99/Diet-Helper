# Memey Diet Planner

A phone-first web app built from `Memey_Diet_Planner_v3.xlsx`. It keeps the
spreadsheet's content — the 69-item Malaysian food database, seven salmon
recipes, the Setiawangsa shopping system, the supplement and micronutrient
protocol, the nine badges — and makes logging a meal take about five seconds
instead of pinch-zooming a 12-column grid.

Bilingual throughout (Malay first, English alongside), installable on iOS and
Android home screens, and works offline.

## Running it

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

That's the whole setup. With no environment variables the app stores
everything in the browser, so a fresh clone is immediately usable.

```bash
pnpm test         # 32 unit tests over the ported formulas
pnpm typecheck
pnpm build
```

## Installing on your phone

**iPhone / iPad** — open the site in Safari, tap Share, then **Add to Home
Screen**. It gets its own icon and launches full-screen with no browser
chrome. No App Store, no developer account. The app shows this hint once on
first visit.

**Android** — Chrome offers "Install app" from the menu.

## Turning on accounts and sync

Browser storage is per-device, and iOS clears a web app's storage after about
seven days of non-use. For data that follows you across devices and survives
that, connect Supabase:

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine).
2. Run `supabase/migrations/0001_init.sql` in the SQL editor. It creates one
   table with row-level security scoped to `auth.uid()`.
3. Copy `.env.example` to `.env.local` and fill in the project URL and anon key
   from Settings → API.
4. Restart. A sign-in screen appears (email magic link or Google), and the app
   reads and writes Postgres instead of the browser.

Deploying to Vercel is the same two variables set in the project's environment
settings.

## How it's put together

```
seed/                  Generated from the workbook — do not hand-edit
src/lib/dates.ts       ISO day-key arithmetic, all in UTC (see below)
scripts/extract_xlsx.py  Regenerates seed/ from .source-workbook.xlsx
src/lib/nutrition.ts   Every formula ported from the sheet, cell refs in comments
src/lib/store/         DataStore interface + local and Supabase implementations
src/app/               One route per screen
supabase/migrations/   Schema and RLS policies
```

The food catalogue is bundled into the JS at build time rather than fetched:
it is 69 rows that only change when the workbook does, so search is instant
and works with no network.

User data goes through a `DataStore` interface with two implementations. The
screens only ever see the interface, so moving between local storage and
Postgres is configuration, not a rewrite.

### Dates

Day keys are `YYYY-MM-DD` strings and all arithmetic on them happens in UTC,
in `src/lib/dates.ts`. Building a `Date` at local midnight and then calling
`toISOString()` shifts the day for anyone east of Greenwich — in UTC+8 it
returned yesterday, which misaligned the week grid and dropped today out of
the streak window. Never mix the two; use the helpers.

The test suite runs under `TZ=Asia/Kuala_Lumpur` (`vitest.config.ts`) for the
same reason: the bug was invisible in UTC.

To re-import after editing the workbook:

```bash
pip install openpyxl
python3 scripts/extract_xlsx.py
```

It asserts 69 foods and 7 recipes survived the round trip.

## Where it deliberately differs from the spreadsheet

- **History is kept.** The sheet's meal grid was seven fixed rows that week 2
  overwrote. Entries here are keyed by real date, so nothing is lost and the
  Dashboard's manual `[AUTO]` weekly averages became real aggregation.
- **Streaks forgive one day a week.** `Streak & Badges!F6` resets to zero on
  any miss. Hard-reset streaks are the failure mode the gamification
  literature flags most consistently, and the evidence for streaks improving
  *dietary* adherence specifically is weak — so a missed day holds the run.
- **BMR takes sex as a parameter.** `Dashboard!B8` hardcodes the female
  constant.
- **The shopping list knows the plan.** "Add from this week's plan" pulls
  ingredients from recipes actually scheduled; the sheet's checklist was a
  fixed column with no link to what you meant to cook.
- **Water is tracked, not just targeted.** `Dashboard!B20` sets a 2.5 L goal
  and the Supplement sheet lays out an hourly schedule, but neither had
  anywhere to record what you drank. Today has a one-tap glass counter.

Tone follows the workbook's own: `✓ Ikut target`, `~ Dekat`, `▲ Lebih`. No
alarm colours, no shaming copy.

## The food catalogue

147 items in two sets, and the app keeps them visibly apart:

- **69 workbook foods**, validated against the Malaysian Food Composition
  Tables and USDA SR Legacy per the source spreadsheet.
- **78 chain and street foods** — the full ZUS Coffee menu, ayam gepuk, kebab,
  Ramly, nasi kandar, Tealive and boba, Korean fried chicken, KFC and the rest.
  These are public estimates and are labelled **est.** in the list, because a
  street portion genuinely varies between outlets. Sources for the same dish
  disagreed by a factor of two while this was compiled, which is exactly why
  they are not presented with the same authority as the workbook's numbers.

Search and the quick-add matcher scan the workbook set first, so a verified
entry wins a tie against an estimated one.

## Adding your own foods

The 69-item catalogue won't have everything. Two ways in:

- **From a search that finds nothing.** Type a name in the meal picker, and
  where the "no matches" message used to dead-end there's now an
  `Add "…"` button. Fill in the form and it's logged immediately — the moment
  you notice something is missing is the moment you'll add it.
- **From the Foods tab**, via `+ New`.

Only name and calories are required. A blank macro counts as zero, because a
rough entry beats a skipped meal.

Custom foods can be deleted; meals already logged keep working. `logFood`
snapshots a custom food's name onto the entry alongside its macros, so
deleting the food never orphans your history.

## Not yet built

Progress photos, body measurements beyond weight and waist/hip, and barcode
or photo logging. The schema leaves room.

## Credits

Emoji artwork is [Twemoji](https://github.com/jdecked/twemoji), licensed
[CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/) and vendored into
`public/emoji/` by `scripts/fetch-emoji.mjs` — committed rather than hotlinked,
because an offline PWA has to render without a network. The badge medallions in
`public/badges/` are generated by `scripts/build-badges.py`: the plates are
original, the glyphs are Twemoji. Full detail in `NOTICE`.

## Motion

Every animation in the app is CSS — transforms and opacity, which the browser
runs on the compositor thread, so a sheet keeps gliding while the food list
below it re-renders.

An animation library was tried and dropped. `motion`'s `LazyMotion` +
`domAnimation` is documented as roughly 6 KB; measured against this build it
cost **42 KB gzipped** on the first load, and the only thing it was doing was
the meal sheet's enter/exit. `src/hooks/usePresence.ts` does the one hard part
— keeping a dismissed element mounted while its exit plays — in about thirty
lines, and skips the hold entirely under `prefers-reduced-motion` so an
invisible dialog never sits over the page swallowing taps.

The whole artwork-and-motion layer adds 2 KB to the first load.

## Health note

This is a personal planning tool, not medical advice. The workbook's full
disclaimer — including its caution around a history of disordered eating — is
in Settings, and applies to this app too.
