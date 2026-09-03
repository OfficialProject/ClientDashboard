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

## Leetify-style profile page (functionality first, styling later)

Client detail page now has a layered hierarchy instead of always showing
every category flat:

- **Hero row** - current overall rank + the single weakest category, at a
  glance, no scrolling needed.
- **Strengths / Weaknesses** (`components/skill-summary.tsx`) - top 3
  best and worst categories only, each with a real trend line built from
  the full sync history (`benchmarkHistory`), not just a two-point delta.
  This is the first thing that actually visualizes the history we've been
  storing since v0.8 - it existed as data but nothing rendered it as a
  trend until now.
- **Full breakdown** - the existing sortable all-categories list
  (`skill-breakdown.tsx`), now collapsed behind a "See full breakdown"
  toggle instead of always-on. Solves the "everything shown at once"
  problem directly.

Styling is intentionally plain right now - functional layout using
existing tokens, no polish pass yet. That's the explicit next step once
the underlying structure is confirmed to be the right one.

## Real session-level activity (not just snapshot-in-time)

Traced through actual working source code (not docs/guesswork) to confirm
a genuine per-play activity feed exists on KovaaK's webapp-backend:

```
GET /webapp-backend/user/activity/recent?username=<webapp username>
-> [{ timestamp, scenarioName, score, leaderboardId, ... }]
```

This is the real thing Leetify-style tools need - actual play-by-play
history with timestamps, not just "current best score as of last sync."
Everything built before this point (`benchmarkHistory`) was snapshot-level
- one point per manual/auto sync, not per session played.

**The steamId -> webapp username gap is closed too.** The account-search
endpoint (`/webapp-backend/leaderboard/global/search/account-names`) takes
a text query, not a steamId - so `lib/kovaaks-identity.ts` searches by the
client's known Steam display name, then filters the candidate matches down
to the one whose `steamId` matches the client we already have on file.
Traced from a working open-source tool (KovaaksCompare) that does exactly
this - not guessed. Resolved once, cached on `client.kovaaksUsername`.

**Confirmed live limitation (not a bug):** the activity feed only works for
players who've actually set a username on their kovaaks.com profile. Many
players just play through Steam and never touch the webapp - for them,
the account-search response has `username: null`. Tested the obvious
fallback (`steamAccountName`) directly against the live activity
endpoint and it does NOT work ("Player does not exist") despite looking
like a plausible substitute - it is genuinely not interchangeable with the
real webapp username. So: this feature has a real, unavoidable coverage
gap. `lib/kovaaks-identity.ts` now returns `null` cleanly in that case
rather than guessing with a fallback that's confirmed broken.

**Cache self-heals now too.** Live testing found a second-order bug: a
client synced *before* the fallback fix above got a bad value cached
permanently in `client.kovaaksUsername` (the old buggy resolver's
`steamAccountName` fallback), and since the caching logic only resolves
when the field is `null`, that bad value was stuck forever - the code fix
alone didn't repair already-cached bad data. `/api/kovaaks/activity` now
re-resolves fresh if the cached username fails against the live API,
clears/replaces the cache accordingly, and resolves cleanly within the
same request rather than requiring a second page load or manual fix.

`components/recent-activity.tsx` is a deliberately minimal first cut -
last 15 plays, scenario + score + relative time, no chart or grouping yet.
Once this is confirmed working against real data, the next step is
folding real per-session timestamps into the trend sparklines instead of
relying only on manual-sync-interval snapshots.

## Fallback: reconstructing activity from public leaderboard data (no username needed)

For clients without a kovaaks.com username, `activity/recent` is a dead
end - but the *scenario leaderboards themselves* are fully public and
steamId-based, no username gate at all. `lib/kovaaks.ts`'s
`findLeaderboardEntry()` searches a scenario's public leaderboard
(`/leaderboard/scores/global`) for a specific player's entry, which
carries a real `epoch` timestamp per entry.

**Confirmed via live testing that a single computed page isn't reliable**:
looked up StkTheLord using his `leaderboard_rank` (27375) from an earlier
sync, computed page 273, and he wasn't on it - leaderboards reorder
constantly as other players improve, so a rank even minutes old can drift
off its expected page. Fixed by searching outward from the expected page
(0, +1, -1, +2, -2...) instead of trusting one exact page, and by always
using a *fresh* rank (re-fetched at request time) rather than a cached
one.

`/api/kovaaks/scenario-history` reconstructs an activity-like feed this
way, capped at 12 scenarios per request (bounds the number of leaderboard
lookups - each scenario needs up to 5 page fetches in the worst case).
`RecentActivity` tries the real feed first, falls back to this
automatically, and labels it clearly in the UI when it's the
reconstruction - **this is "when each scenario's current best was set,"
not a true multi-attempt session log** like the real feed would give.
Worth keeping that distinction visible rather than presenting it as
equivalent.

**Field-name bug found via live testing:** the response has two different
"rank" fields per scenario - `leaderboard_rank` (real global position,
e.g. 27375) and `scenario_rank` (small tier number within the benchmark,
e.g. 4). `getScenarioMeta` grabbed `scenario_rank` for the page-math
calculation instead of `leaderboard_rank` - meaning every lookup computed
page ~0 (searching among the world's top players) instead of the client's
actual page. Not a "windowing wasn't wide enough" problem - it was
searching a completely wrong location every time. Fixed to use
`leaderboard_rank`.

## Real timestamps feeding the summary view

Activity data now flows into the hero row, not just its own panel.
Restructured the fetch to happen once at the page level
(`components/client-detail.tsx`) - tries the real feed, falls back to the
public-leaderboard reconstruction, same chain as before - and passes the
result down to both `RecentActivity` (display) and `SkillSummary` (which
now shows a real "Last played" stat, computed from the most recent
activity entry). `RecentActivity` itself became a plain display component
fed by props instead of fetching on its own, so the same data isn't
requested twice.

Worth being clear about what this is and isn't: "Last played" reflects
actual play data (real or reconstructed from public leaderboards), which
is meaningfully different from the "synced X ago" line already shown -
that one only reflects when *we* last checked KovaaK's, not when the
client actually played. Both are shown, since they answer different
questions. This does NOT yet mean every sparkline data point is
individually timestamped by real play data - the strengths/weaknesses
trend lines still plot by sync order, not by real per-category play
dates. That would need scenario-to-category mapping wired into the client
bundle, a larger change not done here.

## Critical fix: concurrent writes could corrupt the client data file

**Confirmed in real use, not hypothetical:** `data/clients.json` corrupted
in production usage - a genuine "Unexpected non-whitespace character"
JSON parse error crashing every page. Root cause: `lib/store.ts` did
read-the-whole-file -> modify -> write-the-whole-file for every mutation,
with zero locking. Once the roster's bulk sync-all (v1.5) started firing
many concurrent syncs per page load, plus the 5-minute auto-poll, plus
auto-sync-on-assign, it became realistic for two requests to write to the
same file at the same time - and concurrent `fs.writeFile` calls to one
path can interleave mid-write, corrupting it. This is exactly what
happened.

Fixed two ways:
1. **Every operation that touches the file now runs through one
   serialized queue** (`withLock`) - no two reads/writes can ever overlap,
   full stop.
2. **Writes are now atomic** - write to a temp file, then `rename()` into
   place (atomic on POSIX filesystems), instead of writing the real file
   directly. Even a mid-write crash can't leave a half-written file
   behind anymore.

All mutation functions (`createClient`, `appendBenchmarkSnapshot`,
`updateClient`, `addNote`, `deleteClient`) now go through a single
`withClients()` helper that does the read-modify-write as one atomic
locked unit, rather than separate locked read + locked write calls (which
would still race between the two).

**This does not repair an already-corrupted file** - `data/clients.json`
is gitignored on purpose (it holds real client data), so this fix can't
reach into an existing broken file on a running deployment. Recovery
there is manual: back up the broken file, reset to `[]`, re-add clients
(benchmark scores resync automatically from KovaaK's; hand-typed coaching
notes are the one thing that doesn't come back automatically).

## Four parallel features (v2.6)

**1. Rich per-play stats surfaced, not discarded.** Every leaderboard/activity
entry already carried accuracy damage, kills, avg TTK, sensitivity settings -
we were only ever extracting `score`. Now typed properly (`PlayAttributes`
in `lib/kovaaks.ts`) and shown per entry in Recent Activity. Note:
`accuracyDamage` is a damage-based figure from KovaaK's, not a 0-100%
accuracy percentage - labeled as "dmg," not "accuracy%," to avoid
overclaiming what the number actually means.

**2. Activity grouped into inferred sessions**, not a flat list
(`lib/sessions.ts`). Entries within 45 minutes of each other are treated as
one session. Important honesty note, same as the reconstructed-activity
caveat: our data is "best score per scenario," one point each - so this is
"scenarios whose best was set around the same time," inferred as a session,
not a true exhaustive multi-attempt log.

**3. Cross-client roster comparison** (`/api/clients/roster-stats`,
`components/roster-comparison.tsx`) - a client's per-category score against
the average of every other client assigned to the same benchmark. Free win:
entirely built from data already stored, no new external calls.

**4. Consistency stats** - days since last session, sessions in the last
7/30 days - derived directly from the session grouping above.

**5. FACEIT auto-pull, on solid ground this time.** `lib/faceit.ts` uses
FACEIT's official, documented Data API v4 (needs a free `FACEIT_API_KEY`)
- steamId-based, works for any client automatically, no username-resolution
gate like KovaaK's had. Not yet live-tested from this environment (no key
available here) - same as everything else sourced from an external API,
treat the first real sync as a smoke test.

**Premier auto-pull was explicitly NOT built.** It needs a persistent Steam
bot logged into CS2's Game Coordinator - real infrastructure (exactly what
[[ranklab]]'s bot pool exists for), not a REST call. Faking a partial
version would be worse than being upfront that it's out of scope here.
Stays manual entry.

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
