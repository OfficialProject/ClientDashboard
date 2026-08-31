# Esports Coach Dashboard

Roster of CS2 aim-training clients: Steam identity, Premier/FACEIT ranks
(manual entry), any registered KovaaK's benchmark (auto-pulled), and
coaching notes.

## Status - what's real vs what needs a live check

Built and type-checked in a sandboxed environment (`npm install && npx next
build` passes clean). What hasn't been verified is anything requiring an
actual outbound call to `kovaaks.com` or `steamcommunity.com`, since that
environment has no network path to either.

**Verified working (standard, documented APIs):**
- Steam identity lookup (`/api/steam/resolve`, `/api/steam/player`) - the
  official `ISteamUser` Web API, free self-serve key.
- Client roster CRUD, notes, manual Premier/FACEIT entry, benchmark
  assignment - all local, no external dependency.
- The Viscose rank formula (`lib/viscose.ts`) - decoded from
  `Viscose_Benchmarks.xlsx`'s helper sheets and independently confirmed
  against evxl.app's own published rule ("each subcategory ranked by its
  best scenario, overall rank = the lowest subcategory rank").

**Needs one live test pass (unofficial, reverse-engineered API):**
- `lib/kovaaks.ts`'s `getBenchmarkProgress()` calls
  `kovaaks.com/webapp-backend/benchmarks/player-progress-rank-benchmark`,
  undocumented and could change without notice. Contract transcribed from a
  public Postman collection and a working open-source wrapper - not from a
  call this environment could make itself.

## Multi-benchmark architecture

`data/benchmarks.json` is the registry - one entry per benchmark
difficulty, e.g.:

```json
{
  "id": "viscose-s2-easier",
  "benchmarkName": "Viscose Benchmarks S2",
  "difficultyName": "Easier",
  "kovaaksBenchmarkId": 2355,
  "customFormula": "viscose",
  "viscoseDifficultyKey": "easier"
}
```

Two ways a benchmark's rank gets computed (`lib/unified-progress.ts`):

- **`customFormula: "viscose"`** - the decoded Viscose formula
  (`lib/viscose.ts`): discrete tier-threshold match per scenario, best
  scenario per subcategory, worst subcategory wins.
- **`customFormula: "voltaic"`** - the decoded Voltaic formula
  (`lib/voltaic.ts`): a genuinely different system, confirmed from the real
  spreadsheet rather than assumed - continuous piecewise-linear
  interpolation between rank thresholds to get a per-scenario "energy"
  value (extrapolating past the top tier, not capped there), best-of-group
  per subcategory, and overall = truncated **harmonic mean** across all
  subcategory energies (not weakest-link). Advanced's floor anchor
  extrapolates backward using Intermediate's ceiling energy, since there's
  no tier above it to inherit a cap from. Sanity-checked against the
  sheet's own literal threshold values - interpolation lands exactly on the
  listed energy at every threshold.
- **`customFormula: null`** - trusts KovaaK's own computed rank from the
  benchmark-progress response directly. Default for anything we don't have
  a sourced spreadsheet for (currently: Viscose Expert only). evxl.app has
  ~120 benchmarks using bespoke formulas we have no access to and no
  realistic way to reverse-engineer blind - rather than guess, unsourced
  benchmarks use the platform's own native rank instead.

Currently registered: Viscose Benchmarks S2 (Easier/Medium/Hard decoded,
Expert on native) and Voltaic S5.5 (Novice/Intermediate/Advanced, all
decoded).

To add a benchmark: append an entry to `data/benchmarks.json` with its
`kovaaksBenchmarkId`. If a real spreadsheet is available for it later,
decode it the same way Viscose was and add a `"customFormula"` entry.

## Add-client flow

Single field, evxl-style: SteamID64, vanity name, or a pasted
`steamcommunity.com/...` URL (`lib/parse-steam-input.ts` handles all three).
Resolves Steam identity and saves. Benchmark assignment happens afterward,
on the client's own page (not at add time), since which benchmark they're
working on isn't decided at add-time.

## Per-category trends

Every "Sync from KovaaK's" **appends** a dated snapshot to
`client.benchmarkHistory[benchmarkId]` rather than overwriting it, so trend
comparisons are possible from the second sync onward. The client page shows
a sortable list (score or trend, ascending/descending) of every
subcategory - `SkillBreakdown` in `components/skill-breakdown.tsx` - with
labels combining subcategory and category (e.g. "Arm · Aimbotz") since
subcategory names alone repeat across categories and read ambiguously.

Both decoded formulas produce a genuinely continuous, trend-able score:

- **Voltaic** already has one natively - `energy` (0-1200+), used directly.
- **Viscose** only has discrete tiers in the source spreadsheet, so a
  continuous score was built on top: `tier * 100 + progress-within-tier
  (0-99)`. This isn't part of the original formula - it's necessary to make
  "improved by N" meaningful instead of only "moved from Hare to Ermine."
  Documented in `lib/viscose.ts`'s `scenarioScore()`.
- Benchmarks on the **native** (unsourced) path use KovaaK's raw
  `category_rank` index as the score - coarse (whole-tier jumps only, no
  within-tier progress), since that's all the native response provides.

## Home-screen install (PWA)

Not a native app - a real limitation worth restating: this is a web app,
served over HTTP by `npm run dev`/`next start`, running in Safari/Chrome.
What's added here closes most of the "feels like an app" gap cheaply:

- `app/manifest.ts` - generates `/manifest.webmanifest` (name, icons,
  `display: "standalone"` so it opens without browser chrome).
- `public/icon-192.png`, `icon-512.png`, `apple-touch-icon.png` - placeholder
  icons (teal "AC" mark matching the app's palette) - swap these for real
  branding whenever you have some.
- `app/layout.tsx` - wires the manifest + Apple-specific meta (`appleWebApp`
  capable, translucent status bar) so iOS Safari's "Add to Home Screen"
  produces a standalone icon instead of a bookmark.

What this does NOT get you: offline support, push notifications, or an App
Store listing. That's a genuinely different, larger project (Swift/SwiftUI
or React Native) if it's ever actually needed.

## Run

```bash
npm install
cp .env.example .env.local   # fill in STEAM_WEB_API_KEY
npm run dev
```

## Storage

`lib/store.ts` is a JSON file on disk (`data/clients.json`). Fine for local
use or a single always-on server; will **not** persist correctly on a
serverless host (Vercel gives a fresh filesystem per invocation). The rest
of the app only depends on `lib/store.ts`'s function signatures, so
swapping in Postgres/Supabase later is a one-file change.

## Explicitly out of scope (V2)

"Compare with other benchmarks" - estimating a client's rank on a benchmark
they haven't played, based on performance on one they have. Benchmarks
don't share scenarios, so this needs a real cross-benchmark statistical
model built from a population of players who've completed multiple
benchmarks - a research project, not a UI feature. Not started.

## Next steps

1. Do a real sync against a client on each registered benchmark and confirm
   the numbers look sane end-to-end (formula math is sanity-checked in
   isolation, but not yet against a live KovaaK's response).
2. FACEIT/Premier auto-pull (currently manual entry).
3. Historical score tracking (currently only stores the latest synced
   snapshot per benchmark).
4. Swap `lib/store.ts` for a real database before deploying anywhere
   serverless.
