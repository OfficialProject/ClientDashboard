import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { getServiceSupabase } from "../lib/supabase/service";
import { SteamGCBot } from "../lib/steam-gc-bot";
import { nextPendingJob, resolveJob, failJob, markParsing, saveParsedStats, failParse } from "../lib/premier-jobs-store";
import { downloadAndDecompressDemo, parseMatchStatsNative, extractMapName } from "../lib/demo-parser-native";

const POLL_INTERVAL_MS = 5000;
const supabase = getServiceSupabase(); // acts across ALL clients regardless of owner - not one logged-in user's session

// Single-worker assumption: nextPendingJob() doesn't claim/lock a job, it
// just reads the oldest "pending" one. Fine for one worker process
// running sequentially like this loop does; running two of these workers
// at once would let them both pick up the same job. Add a "claimed" state
// before scaling to multiple bot accounts running in parallel.

async function autoParseJob(jobId: string, demoUrl: string) {
  await markParsing(supabase, jobId);
  try {
    console.log(`[gc-bot] auto-parsing job ${jobId}...`);
    const demoBytes = await downloadAndDecompressDemo(demoUrl);
    const stats = parseMatchStatsNative(demoBytes);
    const map = extractMapName(demoBytes);
    await saveParsedStats(supabase, jobId, stats, map);
    console.log(`[gc-bot] auto-parsed job ${jobId}: ${map ?? "unknown map"}, ${stats.rounds} rounds, ${stats.players.length} players`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[gc-bot] auto-parse failed for job ${jobId} (manual re-parse still available):`, message);
    await failParse(supabase, jobId, message);
  }
}

async function main() {
  console.log("[gc-bot] logging into Steam...");
  const bot = new SteamGCBot();
  await bot.login();
  console.log("[gc-bot] connected to GC. Polling for pending demo jobs every " + POLL_INTERVAL_MS + "ms.");

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const job = await nextPendingJob(supabase);
    if (!job) {
      await sleep(POLL_INTERVAL_MS);
      continue;
    }
    console.log(`[gc-bot] resolving job ${job.id} (${job.shareCode})`);
    try {
      const result = await bot.resolveDemoUrl(job.shareCode);
      if (result.demoUrl) {
        await resolveJob(supabase, job.id, result);
        console.log(`[gc-bot] resolved ${job.id} -> ${result.demoUrl}`);
        await autoParseJob(job.id, result.demoUrl);
      } else {
        await failJob(supabase, job.id, "GC returned no match for this share code (invalid/expired code, or demo not yet uploaded)");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[gc-bot] job ${job.id} failed: ${message}`);
      await failJob(supabase, job.id, message);
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
