import { config as loadEnv } from "dotenv";
// Standalone scripts don't get Next.js's automatic .env.local loading -
// load it explicitly, matching Next.js's own file (not plain .env, which
// isn't the file actually in use here).
loadEnv({ path: ".env.local" });

import { SteamGCBot } from "../lib/steam-gc-bot";
import { nextPendingJob, resolveJob, failJob, saveParsedStats } from "../lib/premier-jobs-store";
import { downloadAndDecompressDemo, parseMatchStatsNative } from "../lib/demo-parser-native";

const POLL_INTERVAL_MS = 5000;

// Single-worker assumption: nextPendingJob() doesn't claim/lock a job, it
// just reads the oldest "pending" one. Fine for one worker process
// running sequentially like this loop does; running two of these workers
// at once would let them both pick up the same job. Add a "claimed" state
// before scaling to multiple bot accounts running in parallel.

/**
 * Parses a just-resolved job immediately, in the same worker process that
 * resolved it - this is what makes "user sees their matches on load" true
 * instead of requiring them to click "Parse demo" in the browser. Runs on
 * the current, non-stale native parser (no WASM/CI-build dependency for
 * this path). Failure here doesn't fail the job overall - the demo URL is
 * still saved and resolved, the browser's manual "Parse demo" button
 * stays as a fallback if auto-parsing hits an error.
 */
async function autoParseJob(jobId: string, demoUrl: string) {
  try {
    console.log(`[gc-bot] auto-parsing job ${jobId}...`);
    const demoBytes = await downloadAndDecompressDemo(demoUrl);
    const stats = parseMatchStatsNative(demoBytes);
    await saveParsedStats(jobId, stats);
    console.log(`[gc-bot] auto-parsed job ${jobId}: ${stats.rounds} rounds, ${stats.players.length} players`);
  } catch (err) {
    // Not fatal - the resolved demo URL is already saved, and the browser's
    // manual "Parse demo" button still works as a fallback for this job.
    console.error(`[gc-bot] auto-parse failed for job ${jobId} (manual re-parse still available):`, err);
  }
}

async function main() {
  console.log("[gc-bot] logging into Steam...");
  const bot = new SteamGCBot();
  await bot.login();
  console.log("[gc-bot] connected to GC. Polling for pending demo jobs every " + POLL_INTERVAL_MS + "ms.");

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const job = await nextPendingJob();
    if (!job) {
      await sleep(POLL_INTERVAL_MS);
      continue;
    }
    console.log(`[gc-bot] resolving job ${job.id} (${job.shareCode})`);
    try {
      const result = await bot.resolveDemoUrl(job.shareCode);
      if (result.demoUrl) {
        await resolveJob(job.id, result);
        console.log(`[gc-bot] resolved ${job.id} -> ${result.demoUrl}`);
        await autoParseJob(job.id, result.demoUrl);
      } else {
        await failJob(job.id, "GC returned no match for this share code (invalid/expired code, or demo not yet uploaded)");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[gc-bot] job ${job.id} failed: ${message}`);
      await failJob(job.id, message);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error("[gc-bot] fatal error, exiting:", err);
  process.exit(1);
});
