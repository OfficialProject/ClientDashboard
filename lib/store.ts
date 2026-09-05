import { promises as fs } from "fs";
import path from "path";
import type { Client, Note, Goal, Routine, UnifiedBenchmarkProgress } from "./types";

/**
 * v1 storage: a JSON file on disk. This works fine for local dev and for
 * a single always-on server, but will NOT persist correctly on serverless
 * hosts (Vercel etc. give you a fresh filesystem per invocation). Swap
 * this module for a real Postgres/Supabase-backed implementation before
 * deploying anywhere serverless - the rest of the app only depends on the
 * function signatures below, not on how they're implemented.
 *
 * CONFIRMED LIVE BUG, FIXED HERE: every read-modify-write here used to run
 * with no locking at all. Once the roster's bulk sync-all (v1.5) started
 * firing many concurrent syncs, plus the 5-minute auto-poll, plus
 * auto-sync-on-assign, it became realistic for two requests to read and
 * write clients.json at the same time - and concurrent fs.writeFile calls
 * to the same path can interleave, corrupting the file (confirmed: a real
 * "Unexpected non-whitespace character" JSON parse error in production
 * use, not a hypothetical). Fixed two ways: (1) every operation that
 * touches the file now runs through a single serialized queue, so no two
 * can overlap; (2) writes go to a temp file and get renamed into place
 * (atomic on POSIX filesystems), so even a crash mid-write can't leave a
 * half-written file behind.
 */

const DATA_FILE = path.join(process.cwd(), "data", "clients.json");

// Serializes all file access through one queue - this is the actual fix.
let queue: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const result = queue.then(fn, fn); // run after prior op regardless of its outcome
  queue = result.catch(() => {}); // don't let one failure poison the whole queue
  return result;
}

async function readAllUnlocked(): Promise<Client[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const clients = JSON.parse(raw) as Client[];
    // Back-compat: clients saved before these fields existed won't have them.
    return clients.map((c) => ({
      ...c,
      goals: c.goals ?? [],
      routines: c.routines ?? [],
      faceitSyncedAt: c.faceitSyncedAt ?? null,
      steamAuthCode: c.steamAuthCode ?? null,
      lastKnownShareCode: c.lastKnownShareCode ?? null,
    }));
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeAllUnlocked(clients: Client[]): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  const tmpFile = `${DATA_FILE}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmpFile, JSON.stringify(clients, null, 2), "utf-8");
  await fs.rename(tmpFile, DATA_FILE); // atomic on POSIX - no half-written file possible
}

async function readAll(): Promise<Client[]> {
  return withLock(readAllUnlocked);
}

/** Read-modify-write as one atomic unit - use this instead of separate readAll+writeAll for any mutation. */
async function withClients<T>(fn: (clients: Client[]) => T | Promise<T>): Promise<T> {
  return withLock(async () => {
    const clients = await readAllUnlocked();
    const result = await fn(clients);
    await writeAllUnlocked(clients);
    return result;
  });
}

export async function listClients(): Promise<Client[]> {
  return readAll();
}

export async function getClient(id: string): Promise<Client | null> {
  const clients = await readAll();
  return clients.find((c) => c.id === id) ?? null;
}

export async function createClient(input: {
  nickname: string;
  steamId: string;
  steamName: string;
  avatar: string;
}): Promise<Client> {
  return withClients((clients) => {
    const client: Client = {
      id: crypto.randomUUID(),
      nickname: input.nickname || input.steamName,
      steamId: input.steamId,
      steamName: input.steamName,
      avatar: input.avatar,
      premierRating: null,
      faceitLevel: null,
      faceitElo: null,
      faceitSyncedAt: null,
      steamAuthCode: null,
      lastKnownShareCode: null,
      kovaaksUsername: null,
      assignedBenchmarkId: null,
      benchmarkHistory: {},
      notes: [],
      goals: [],
      routines: [],
      createdAt: new Date().toISOString(),
    };
    clients.push(client);
    return client;
  });
}

/** Appends a dated snapshot rather than overwriting - this is what makes trends possible. */
export async function appendBenchmarkSnapshot(
  id: string,
  benchmarkId: string,
  progress: UnifiedBenchmarkProgress
): Promise<Client | null> {
  return withClients((clients) => {
    const idx = clients.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    const existing = clients[idx].benchmarkHistory[benchmarkId] ?? [];
    clients[idx].benchmarkHistory = {
      ...clients[idx].benchmarkHistory,
      [benchmarkId]: [...existing, progress],
    };
    return clients[idx];
  });
}

export async function updateClient(
  id: string,
  patch: Partial<Client>
): Promise<Client | null> {
  return withClients((clients) => {
    const idx = clients.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    clients[idx] = { ...clients[idx], ...patch };
    return clients[idx];
  });
}

export async function addNote(id: string, text: string): Promise<Client | null> {
  return withClients((clients) => {
    const idx = clients.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    const note: Note = { id: crypto.randomUUID(), date: new Date().toISOString(), text };
    clients[idx].notes = [note, ...clients[idx].notes];
    return clients[idx];
  });
}

export async function addGoal(
  id: string,
  input: { benchmarkId: string; category: string; subcategory: string; targetScore: number }
): Promise<Client | null> {
  return withClients((clients) => {
    const idx = clients.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    const goal: Goal = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...input };
    clients[idx].goals = [...clients[idx].goals, goal];
    return clients[idx];
  });
}

export async function deleteGoal(id: string, goalId: string): Promise<Client | null> {
  return withClients((clients) => {
    const idx = clients.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    clients[idx].goals = clients[idx].goals.filter((g) => g.id !== goalId);
    return clients[idx];
  });
}

export async function addRoutine(
  id: string,
  input: { name: string; benchmarkId: string; scenarios: string[]; source: Routine["source"] }
): Promise<Client | null> {
  return withClients((clients) => {
    const idx = clients.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    const routine: Routine = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...input };
    clients[idx].routines = [routine, ...clients[idx].routines];
    return clients[idx];
  });
}

export async function deleteRoutine(id: string, routineId: string): Promise<Client | null> {
  return withClients((clients) => {
    const idx = clients.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    clients[idx].routines = clients[idx].routines.filter((r) => r.id !== routineId);
    return clients[idx];
  });
}

export async function deleteClient(id: string): Promise<void> {
  return withClients((clients) => {
    const remaining = clients.filter((c) => c.id !== id);
    clients.length = 0;
    clients.push(...remaining);
  });
}
