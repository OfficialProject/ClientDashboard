import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/database.types";

/**
 * v2 storage: Supabase, replacing the v1 JSON-file job queue. The
 * cross-process race risk documented in v1 (two Node processes writing the
 * same file) is gone entirely - Postgres handles concurrent writes
 * correctly, which was the whole reason that risk existed in the first
 * place.
 */

type SB = SupabaseClient<Database>;
type JobRow = Database["public"]["Tables"]["premier_demo_jobs"]["Row"];

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
  parseStatus: "unparsed" | "parsing" | "parsed" | "error";
  parseError: string | null;
}

function fromRow(r: JobRow): PremierDemoJob {
  return {
    id: r.id,
    clientId: r.client_id,
    shareCode: r.share_code,
    status: r.status as PremierDemoJob["status"],
    demoUrl: r.demo_url,
    map: r.map,
    error: r.error,
    createdAt: r.created_at,
    resolvedAt: r.resolved_at,
    parsedStats: r.parsed_stats,
    parseStatus: r.parse_status as PremierDemoJob["parseStatus"],
    parseError: r.parse_error,
  };
}

export async function listJobs(supabase: SB, clientId?: string): Promise<PremierDemoJob[]> {
  let query = supabase.from("premier_demo_jobs").select("*").order("created_at", { ascending: true });
  if (clientId) query = query.eq("client_id", clientId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function enqueueJob(supabase: SB, clientId: string, shareCode: string): Promise<PremierDemoJob> {
  const { data, error } = await supabase
    .from("premier_demo_jobs")
    .insert({ client_id: clientId, share_code: shareCode })
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

/** Used by the worker process: grabs the oldest pending job, if any. Single-worker assumption unchanged from v1 - see gc-bot-worker.ts. */
export async function nextPendingJob(supabase: SB): Promise<PremierDemoJob | null> {
  const { data, error } = await supabase
    .from("premier_demo_jobs")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? fromRow(data) : null;
}

export async function resolveJob(supabase: SB, id: string, result: { demoUrl: string | null; map: string | null }): Promise<void> {
  const { error } = await supabase
    .from("premier_demo_jobs")
    .update({ status: "resolved", demo_url: result.demoUrl, map: result.map, resolved_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function failJob(supabase: SB, id: string, errorMessage: string): Promise<void> {
  const { error } = await supabase
    .from("premier_demo_jobs")
    .update({ status: "error", error: errorMessage, resolved_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function markParsing(supabase: SB, id: string): Promise<void> {
  const { error } = await supabase
    .from("premier_demo_jobs")
    .update({ parse_status: "parsing", parse_error: null })
    .eq("id", id);
  if (error) throw error;
}

export async function saveParsedStats(
  supabase: SB,
  id: string,
  parsedStats: unknown,
  map?: string | null
): Promise<PremierDemoJob | null> {
  const patch: Database["public"]["Tables"]["premier_demo_jobs"]["Update"] = {
    parsed_stats: parsedStats as JobRow["parsed_stats"],
    parse_status: "parsed",
    parse_error: null,
  };
  if (map !== undefined && map !== null) patch.map = map;
  const { data, error } = await supabase.from("premier_demo_jobs").update(patch).eq("id", id).select().maybeSingle();
  if (error) throw error;
  return data ? fromRow(data) : null;
}

export async function failParse(supabase: SB, id: string, errorMessage: string): Promise<void> {
  const { error } = await supabase
    .from("premier_demo_jobs")
    .update({ parse_status: "error", parse_error: errorMessage })
    .eq("id", id);
  if (error) throw error;
}
