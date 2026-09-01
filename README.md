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

## Known issue found via live testing: Viscose has drifted from the spreadsheet

First real sync (Easier, benchmarkId 2335) surfaced something the sandbox
could never have caught: **the live benchmark has been revised since the
spreadsheet was made.** The real API returns a **9-tier** ladder (Lemming,
Hare, Ermine, **Puffin**, Penguin, Fox, Mammoth, Orca, Seal) - the sheet
only had 8, no Puffin - and several scenario names differ outright (live:
"Whisphere Viscose Easier"; sheet: "WhisphereRawControl Larger + Slowed").
That's why syncing returned all zeros: exact-name matching against the
stale sheet data matched nothing.

Fix: Easier, Medium, and Hard are all switched to `customFormula: null`
(native) as of this build - Medium/Hard weren't tested live, but came from
the same spreadsheet snapshot, so treated as equally suspect rather than
waiting to find out the hard way. The live response already computes
correct ranks server-side using the *current* tier ladder, and that
ladder still uses Viscose's real names, so nothing is lost by trusting it
here instead of the decoded formula. `lib/viscose.ts` and
`lib/viscose-data.json` are left in the repo (the math itself was verified
correct against what it was built from), but nothing in the registry uses
them right now. If Viscose data is ever needed again, it'd mean sourcing a
current spreadsheet and re-running the same extraction process, not
reusing what's there today.

Also improved while fixing this: the native adapter now uses each
category's continuous `benchmark_progress` value as its trend score
instead of the coarse `category_rank` index - matches Voltaic's energy
granularity, so trends on native-path benchmarks aren't limited to
whole-tier jumps anymore.

**Voltaic hasn't been live-tested at all yet** - still on its decoded
formula, unverified against a real response the same way Viscose just was.

## Known issue found via live testing: Voltaic Advanced gave negative energy for unplayed scenarios

Live use surfaced a real bug in the decoded Voltaic formula, in the
Advanced-difficulty backward-extrapolation case specifically. The actual
sheet formula's match array is `{0, H-(I-H), H, I, J, K}` - **six**
breakpoints, including an explicit `0 score -> 0 energy` anchor before the
synthetic floor. The original implementation only had five breakpoints
(missing that leading zero-anchor), so an unplayed Advanced scenario
(score 0) fell into the synthetic-floor segment and extrapolated
*backward* into negative energy instead of hitting an exact 0 match.
Fixed in `lib/voltaic.ts`'s `scenarioEnergy()` - verified against the
sheet's own thresholds: score 0 now gives energy 0 exactly, and the
threshold-boundary values still land exactly where the sheet says they
should (unchanged from before).

## Auto-sync

- **Roster page triggers a bulk refresh on load** (`/api/kovaaks/sync-all`)
  - every client with an assigned benchmark gets synced *before* you tap
  into any specific profile, not after. Throttled to skip anyone synced
  within the last 2 minutes, so repeatedly reopening the roster doesn't
  hammer KovaaK's API for no reason.
- **Assigning a benchmark syncs immediately** on the client's own page too.
- **Live polling while a client's page is open** - re-syncs every 5 minutes
  as a background top-up during a long session.

What this is NOT: true always-on background refresh with nobody looking at
the app at all. That needs always-on hosting plus a real database instead
of the local JSON file store (`lib/store.ts`) - both already listed under
Next steps, neither started.

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

## Steam identity resolver

`lib/steam.ts`'s `resolveToSteamId64()` normalizes any of three input
formats to a raw SteamID64 before hitting APIs that are strict about it
(KovaaK's webapp-backend rejects anything that isn't exactly `/^\d{17}$/`):

- Raw SteamID64 - passed through as-is, no network call.
- Vanity URL slug or full `steamcommunity.com/id/...`/`/profiles/...` URL -
  resolved via Steam's official `ResolveVanityURL`.

**Bare display names are explicitly not supported** - deliberate, not an
oversight. Steam's Web API has no display-name lookup at all (only vanity
URL resolution), and display names aren't even unique across accounts. The
only way to do this at all is scraping Steam Community's unofficial search
page - same fragility class as the client-rendered pages that broke the
evxl-scraping approach earlier in this build - so it was left out rather
than built on a foundation known to be unreliable. Passing a bare name
(anything with a space) returns a clear error telling you to paste a
profile link or vanity URL instead of a generic "not found."

Used automatically wherever a client's stored `steamId` is sent to
KovaaK's (`lib/unified-progress.ts`), and exposed standalone at
`/api/steam/resolve-any?input=...` for quick manual lookups.

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
