import { promises as fs } from "fs";
import path from "path";

/**
 * Same atomic-write JSON-file pattern as lib/store.ts, with one added
 * risk: this file is written from TWO separate Node processes (the
 * Next.js server enqueues jobs, the standalone gc-bot worker resolves
 * them), so the in-process write-queue lock that protects clients.json
 * doesn't fully protect this file - two truly simultaneous writes from
 * different processes could still race, with the atomic rename meaning
 * the loser's update is silently dropped rather than corrupting the
 * file. Low-probability given this runs one worker against one job at a
 * time, but real. Same "swap for a real DB before this matters" note as
 * clients.json - more urgent here since two processes touch it.
 */

export interface PremierDemoJob {
  id: string;
  clientId: string;
  shareCode: string;
  status: "pending" | "resolved" | "error";
  demoUrl: string | null;
  map: string | null;
  error: string | null;
  createdAt: string;
  resolvedAt: string | null;
  parsedStats: unknown | null;
  /** Explicit state for the SEPARATE parsing step (resolution and parsing are two different things that can each fail independently) - without this, a stuck or silently-failed auto-parse in the worker looked identical to "still working" from the UI, with a spinner that never resolved and no error surfaced. */
  parseStatus: "unparsed" | "parsing" | "parsed" | "error";
  parseError: string | null;
}

const DATA_FILE = path.join(process.cwd(), "data", "premier-demo-jobs.json");

let queue: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const result = queue.then(fn, fn);
  queue = result.catch(() => {});
  return result;
}

async function readAllUnlocked(): Promise<PremierDemoJob[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const jobs = JSON.parse(raw) as PremierDemoJob[];
    // Back-compat with jobs saved before parseStatus existed.
    return jobs.map((j) => ({
      ...j,
      parsedStats: j.parsedStats ?? null,
      parseStatus: j.parseStatus ?? (j.parsedStats ? "parsed" : "unparsed"),
      parseError: j.parseError ?? null,
    }));
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeAllUnlocked(jobs: PremierDemoJob[]): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  const tmpFile = `${DATA_FILE}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmpFile, JSON.stringify(jobs, null, 2), "utf-8");
  await fs.rename(tmpFile, DATA_FILE);
}

export async function listJobs(clientId?: string): Promise<PremierDemoJob[]> {
  return withLock(async () => {
    const jobs = await readAllUnlocked();
    return clientId ? jobs.filter((j) => j.clientId === clientId) : jobs;
  });
}

export async function enqueueJob(clientId: string, shareCode: string): Promise<PremierDemoJob> {
  return withLock(async () => {
    const jobs = await readAllUnlocked();
    const job: PremierDemoJob = {
      id: crypto.randomUUID(),
      clientId,
      shareCode,
      status: "pending",
      demoUrl: null,
      map: null,
      error: null,
      createdAt: new Date().toISOString(),
      resolvedAt: null,
      parsedStats: null,
      parseStatus: "unparsed",
      parseError: null,
    };
    jobs.push(job);
    await writeAllUnlocked(jobs);
    return job;
  });
}

/** Used by the worker process: grabs the oldest pending job, if any, without removing it (marks in-progress by the caller once picked up). */
export async function nextPendingJob(): Promise<PremierDemoJob | null> {
  return withLock(async () => {
    const jobs = await readAllUnlocked();
    return jobs.find((j) => j.status === "pending") ?? null;
  });
}

export async function resolveJob(id: string, result: { demoUrl: string | null; map: string | null }): Promise<void> {
  return withLock(async () => {
    const jobs = await readAllUnlocked();
    const idx = jobs.findIndex((j) => j.id === id);
    if (idx === -1) return;
    jobs[idx] = { ...jobs[idx], status: "resolved", demoUrl: result.demoUrl, map: result.map, resolvedAt: new Date().toISOString() };
    await writeAllUnlocked(jobs);
  });
}

export async function failJob(id: string, error: string): Promise<void> {
  return withLock(async () => {
    const jobs = await readAllUnlocked();
    const idx = jobs.findIndex((j) => j.id === id);
    if (idx === -1) return;
    jobs[idx] = { ...jobs[idx], status: "error", error, resolvedAt: new Date().toISOString() };
    await writeAllUnlocked(jobs);
  });
}

export async function markParsing(id: string): Promise<void> {
  return withLock(async () => {
    const jobs = await readAllUnlocked();
    const idx = jobs.findIndex((j) => j.id === id);
    if (idx === -1) return;
    jobs[idx] = { ...jobs[idx], parseStatus: "parsing", parseError: null };
    await writeAllUnlocked(jobs);
  });
}

export async function saveParsedStats(id: string, parsedStats: unknown, map?: string | null): Promise<PremierDemoJob | null> {
  return withLock(async () => {
    const jobs = await readAllUnlocked();
    const idx = jobs.findIndex((j) => j.id === id);
    if (idx === -1) return null;
    jobs[idx] = {
      ...jobs[idx],
      parsedStats,
      parseStatus: "parsed",
      parseError: null,
      map: map !== undefined && map !== null ? map : jobs[idx].map,
    };
    await writeAllUnlocked(jobs);
    return jobs[idx];
  });
}

export async function failParse(id: string, error: string): Promise<void> {
  return withLock(async () => {
    const jobs = await readAllUnlocked();
    const idx = jobs.findIndex((j) => j.id === id);
    if (idx === -1) return;
    jobs[idx] = { ...jobs[idx], parseStatus: "error", parseError: error };
    await writeAllUnlocked(jobs);
  });
}
