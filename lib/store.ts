import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/database.types";
import type { Client, Note, Goal, Routine, UnifiedBenchmarkProgress } from "./types";

/**
 * v2 storage: Supabase/Postgres, replacing the v1 JSON-file store. Every
 * function here takes a Supabase client as its first argument instead of
 * reading a global file - callers pass either a per-request, cookie-scoped
 * client (getServerSupabase(), RLS-enforced, used by API routes acting on
 * behalf of a logged-in user) or a service-role client (getServiceSupabase(),
 * bypasses RLS, used by background workers that operate across all clients).
 * The RLS policies from the schema migration are the actual multi-tenancy
 * boundary now - not application-level filtering - so a per-request client
 * only ever sees rows it owns without this file needing to filter manually.
 */

type SB = SupabaseClient<Database>;
type ClientRow = Database["public"]["Tables"]["clients"]["Row"];
type SnapshotRow = Database["public"]["Tables"]["benchmark_snapshots"]["Row"];
type NoteRow = Database["public"]["Tables"]["notes"]["Row"];
type GoalRow = Database["public"]["Tables"]["goals"]["Row"];
type RoutineRow = Database["public"]["Tables"]["routines"]["Row"];

function noteFromRow(r: NoteRow): Note {
  return { id: r.id, date: r.created_at, text: r.text };
}

function goalFromRow(r: GoalRow): Goal {
  return {
    id: r.id,
    benchmarkId: r.benchmark_id,
    category: r.category,
    subcategory: r.subcategory,
    targetScore: Number(r.target_score),
    createdAt: r.created_at,
  };
}

function routineFromRow(r: RoutineRow): Routine {
  return {
    id: r.id,
    name: r.name,
    benchmarkId: r.benchmark_id,
    scenarios: r.scenarios as string[],
    source: r.source as Routine["source"],
    createdAt: r.created_at,
  };
}

/** Assembles the full Client shape (matching the old JSON-store contract) from its normalized rows - keeps every downstream component's expectations unchanged even though the storage underneath is fully relational now. */
async function hydrateClient(supabase: SB, row: ClientRow): Promise<Client> {
  const [{ data: snapshots }, { data: notes }, { data: goals }, { data: routines }] = await Promise.all([
    supabase.from("benchmark_snapshots").select("*").eq("client_id", row.id).order("synced_at", { ascending: true }),
    supabase.from("notes").select("*").eq("client_id", row.id).order("created_at", { ascending: false }),
    supabase.from("goals").select("*").eq("client_id", row.id),
    supabase.from("routines").select("*").eq("client_id", row.id).order("created_at", { ascending: false }),
  ]);

  const benchmarkHistory: Record<string, UnifiedBenchmarkProgress[]> = {};
  for (const s of (snapshots ?? []) as SnapshotRow[]) {
    (benchmarkHistory[s.benchmark_id] ??= []).push({
      benchmarkId: s.benchmark_id,
      benchmarkName: s.benchmark_id, // resolved from the registry at display time, same as v1
      difficultyName: "",
      overallRankName: s.overall_rank_name ?? "",
      groups: s.groups as UnifiedBenchmarkProgress["groups"],
      scenarioScores: s.scenario_scores as Record<string, number>,
      scenarioLeaderboardRanks: s.scenario_leaderboard_ranks as Record<string, number>,
      syncedAt: s.synced_at,
    });
  }

  return {
    id: row.id,
    nickname: row.nickname,
    steamId: row.steam_id,
    steamName: row.steam_name ?? "",
    avatar: row.avatar ?? "",
    premierRating: row.premier_rating,
    faceitLevel: row.faceit_level,
    faceitElo: row.faceit_elo,
    faceitSyncedAt: row.faceit_synced_at,
    steamAuthCode: row.steam_auth_code,
    lastKnownShareCode: row.last_known_share_code,
    kovaaksUsername: row.kovaaks_username,
    assignedBenchmarkId: row.assigned_benchmark_id,
    benchmarkHistory,
    notes: (notes ?? []).map(noteFromRow),
    goals: (goals ?? []).map(goalFromRow),
    routines: (routines ?? []).map(routineFromRow),
    createdAt: row.created_at,
  };
}

export async function listClients(supabase: SB): Promise<Client[]> {
  const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return Promise.all((data ?? []).map((row) => hydrateClient(supabase, row)));
}

export async function getClient(supabase: SB, id: string): Promise<Client | null> {
  const { data, error } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return hydrateClient(supabase, data);
}

export async function createClient(
  supabase: SB,
  input: { nickname: string; steamId: string; steamName: string; avatar: string }
): Promise<Client> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("clients")
    .insert({
      owner_id: user.id,
      nickname: input.nickname || input.steamName,
      steam_id: input.steamId,
      steam_name: input.steamName,
      avatar: input.avatar,
    })
    .select()
    .single();
  if (error) throw error;
  return hydrateClient(supabase, data);
}

/** Inserts a dated snapshot row rather than overwriting - this is what makes trends possible. */
export async function appendBenchmarkSnapshot(
  supabase: SB,
  id: string,
  benchmarkId: string,
  progress: UnifiedBenchmarkProgress
): Promise<Client | null> {
  const { error } = await supabase.from("benchmark_snapshots").insert({
    client_id: id,
    benchmark_id: benchmarkId,
    overall_rank_name: progress.overallRankName,
    groups: progress.groups,
    scenario_scores: progress.scenarioScores,
    scenario_leaderboard_ranks: progress.scenarioLeaderboardRanks,
    synced_at: progress.syncedAt,
  });
  if (error) throw error;
  return getClient(supabase, id);
}

const CLIENT_PATCH_COLUMNS: Record<string, string> = {
  nickname: "nickname",
  premierRating: "premier_rating",
  faceitLevel: "faceit_level",
  faceitElo: "faceit_elo",
  faceitSyncedAt: "faceit_synced_at",
  assignedBenchmarkId: "assigned_benchmark_id",
  steamAuthCode: "steam_auth_code",
  lastKnownShareCode: "last_known_share_code",
};

export async function updateClient(supabase: SB, id: string, patch: Partial<Client>): Promise<Client | null> {
  const row: Database["public"]["Tables"]["clients"]["Update"] = {};
  for (const [key, value] of Object.entries(patch)) {
    const column = CLIENT_PATCH_COLUMNS[key];
    if (column) (row as Record<string, unknown>)[column] = value;
  }
  if (Object.keys(row).length === 0) return getClient(supabase, id);

  const { error } = await supabase.from("clients").update(row).eq("id", id);
  if (error) throw error;
  return getClient(supabase, id);
}

export async function addNote(supabase: SB, id: string, text: string): Promise<Client | null> {
  const { error } = await supabase.from("notes").insert({ client_id: id, text });
  if (error) throw error;
  return getClient(supabase, id);
}

export async function addGoal(
  supabase: SB,
  id: string,
  input: { benchmarkId: string; category: string; subcategory: string; targetScore: number }
): Promise<Client | null> {
  const { error } = await supabase.from("goals").insert({
    client_id: id,
    benchmark_id: input.benchmarkId,
    category: input.category,
    subcategory: input.subcategory,
    target_score: input.targetScore,
  });
  if (error) throw error;
  return getClient(supabase, id);
}

export async function deleteGoal(supabase: SB, id: string, goalId: string): Promise<Client | null> {
  const { error } = await supabase.from("goals").delete().eq("id", goalId).eq("client_id", id);
  if (error) throw error;
  return getClient(supabase, id);
}

export async function addRoutine(
  supabase: SB,
  id: string,
  input: { name: string; benchmarkId: string; scenarios: string[]; source: Routine["source"] }
): Promise<Client | null> {
  const { error } = await supabase.from("routines").insert({
    client_id: id,
    name: input.name,
    benchmark_id: input.benchmarkId,
    scenarios: input.scenarios,
    source: input.source,
  });
  if (error) throw error;
  return getClient(supabase, id);
}

export async function deleteRoutine(supabase: SB, id: string, routineId: string): Promise<Client | null> {
  const { error } = await supabase.from("routines").delete().eq("id", routineId).eq("client_id", id);
  if (error) throw error;
  return getClient(supabase, id);
}

export async function deleteClient(supabase: SB, id: string): Promise<void> {
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
}
