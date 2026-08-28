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

## Not yet built

Progress photos, body measurements beyond weight and waist/hip, and barcode
or photo logging. The schema leaves room.

## Health note

This is a personal planning tool, not medical advice. The workbook's full
disclaimer — including its caution around a history of disordered eating — is
in Settings, and applies to this app too.
