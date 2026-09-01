import { promises as fs } from "fs";
import path from "path";
import type { Client, Note, UnifiedBenchmarkProgress } from "./types";

/**
 * v1 storage: a JSON file on disk. This works fine for local dev and for
 * a single always-on server, but will NOT persist correctly on serverless
 * hosts (Vercel etc. give you a fresh filesystem per invocation). Swap
 * this module for a real Postgres/Supabase-backed implementation before
 * deploying anywhere serverless - the rest of the app only depends on the
 * function signatures below, not on how they're implemented.
 */

const DATA_FILE = path.join(process.cwd(), "data", "clients.json");

async function readAll(): Promise<Client[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeAll(clients: Client[]): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(clients, null, 2), "utf-8");
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
  const clients = await readAll();
  const client: Client = {
    id: crypto.randomUUID(),
    nickname: input.nickname || input.steamName,
    steamId: input.steamId,
    steamName: input.steamName,
    avatar: input.avatar,
    premierRating: null,
    faceitLevel: null,
    faceitElo: null,
    kovaaksUsername: null,
    assignedBenchmarkId: null,
    benchmarkHistory: {},
    notes: [],
    createdAt: new Date().toISOString(),
  };
  clients.push(client);
  await writeAll(clients);
  return client;
}

/** Appends a dated snapshot rather than overwriting - this is what makes trends possible. */
export async function appendBenchmarkSnapshot(
  id: string,
  benchmarkId: string,
  progress: UnifiedBenchmarkProgress
): Promise<Client | null> {
  const clients = await readAll();
  const idx = clients.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  const existing = clients[idx].benchmarkHistory[benchmarkId] ?? [];
  clients[idx].benchmarkHistory = {
    ...clients[idx].benchmarkHistory,
    [benchmarkId]: [...existing, progress],
  };
  await writeAll(clients);
  return clients[idx];
}

export async function updateClient(
  id: string,
  patch: Partial<Client>
): Promise<Client | null> {
  const clients = await readAll();
  const idx = clients.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  clients[idx] = { ...clients[idx], ...patch };
  await writeAll(clients);
  return clients[idx];
}

export async function addNote(id: string, text: string): Promise<Client | null> {
  const clients = await readAll();
  const idx = clients.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  const note: Note = { id: crypto.randomUUID(), date: new Date().toISOString(), text };
  clients[idx].notes = [note, ...clients[idx].notes];
  await writeAll(clients);
  return clients[idx];
}

export async function deleteClient(id: string): Promise<void> {
  const clients = await readAll();
  await writeAll(clients.filter((c) => c.id !== id));
}
