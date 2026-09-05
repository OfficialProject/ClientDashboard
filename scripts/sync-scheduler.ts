import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); // standalone scripts don't get Next.js's automatic .env.local loading

import { syncAllKovaaksProgress } from "../lib/kovaaks-sync";
import { refreshAllFaceitRanks } from "../lib/faceit-sync";
import { autoDiscoverPremierMatches } from "../lib/premier-auto-discovery";

const INTERVAL_MS = Number(process.env.SYNC_INTERVAL_MINUTES ?? 15) * 60 * 1000;

async function runOnce() {
  const startedAt = new Date().toISOString();
  console.log(`[sync-scheduler] run starting ${startedAt}`);

  try {
    const kovaaks = await syncAllKovaaksProgress();
    const synced = kovaaks.filter((r) => r.synced).length;
    const failed = kovaaks.filter((r) => r.error);
    console.log(`[sync-scheduler] KovaaK's: ${synced} synced, ${kovaaks.length - synced} skipped/failed`);
    if (failed.length) console.log(`[sync-scheduler] KovaaK's failures:`, failed);
  } catch (err) {
    console.error("[sync-scheduler] KovaaK's sync-all threw:", err);
  }

  try {
    const faceit = await refreshAllFaceitRanks();
    const synced = faceit.filter((r) => r.synced).length;
    const failed = faceit.filter((r) => r.error);
    console.log(`[sync-scheduler] FACEIT: ${synced} synced, ${faceit.length - synced} skipped/failed`);
    if (failed.length) console.log(`[sync-scheduler] FACEIT failures:`, failed);
  } catch (err) {
    console.error("[sync-scheduler] FACEIT sync-all threw:", err);
  }

  try {
    const premier = await autoDiscoverPremierMatches();
    const totalNew = premier.reduce((sum, r) => sum + r.newJobsEnqueued, 0);
    console.log(`[sync-scheduler] Premier auto-discovery: ${totalNew} new demo jobs enqueued across ${premier.length} eligible clients`);
    const failed = premier.filter((r) => r.error);
    if (failed.length) console.log(`[sync-scheduler] Premier discovery failures:`, failed);
  } catch (err) {
    console.error("[sync-scheduler] Premier auto-discovery threw:", err);
  }

  console.log(`[sync-scheduler] run complete, next run in ${INTERVAL_MS / 60000} minutes`);
}

async function main() {
  console.log(`[sync-scheduler] starting, interval = ${INTERVAL_MS / 60000} minutes`);
  // Run once immediately on startup, then on the interval - don't make the first sync wait a full interval.
  await runOnce();
  setInterval(runOnce, INTERVAL_MS);
}

main().catch((err) => {
  console.error("[sync-scheduler] fatal error, exiting:", err);
  process.exit(1);
});
