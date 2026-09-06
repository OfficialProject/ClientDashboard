import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/database.types";
import { getClient, updateClient, listClients } from "./store";
import { getFaceitPlayerBySteamId } from "./faceit";
import type { Client } from "./types";

type SB = SupabaseClient<Database>;

export async function refreshFaceitRank(supabase: SB, clientId: string): Promise<Client> {
  const client = await getClient(supabase, clientId);
  if (!client) throw new Error("Client not found");

  const player = await getFaceitPlayerBySteamId(client.steamId);
  if (!player) throw new Error("No FACEIT account found linked to this client's Steam ID.");

  const cs2 = player.games?.cs2;
  const updated = await updateClient(supabase, clientId, {
    faceitLevel: cs2?.skill_level ?? null,
    faceitElo: cs2?.faceit_elo ?? null,
    faceitSyncedAt: new Date().toISOString(),
  });
  if (!updated) throw new Error("Client not found");
  return updated;
}

const DEFAULT_MIN_AGE_MS = 15 * 60 * 1000; // don't re-poll a client whose FACEIT rank was checked more recently than this

export interface FaceitSyncAllResult {
  clientId: string;
  synced?: boolean;
  skipped?: boolean;
  error?: string;
}

export async function refreshAllFaceitRanks(supabase: SB, minAgeMs = DEFAULT_MIN_AGE_MS): Promise<FaceitSyncAllResult[]> {
  const clients = await listClients(supabase);
  const eligible = clients.filter((c) => c.steamId);
  const now = Date.now();

  const results = await Promise.allSettled(
    eligible.map(async (c): Promise<FaceitSyncAllResult> => {
      if (c.faceitSyncedAt && now - new Date(c.faceitSyncedAt).getTime() < minAgeMs) {
        return { clientId: c.id, skipped: true };
      }
      await refreshFaceitRank(supabase, c.id);
      return { clientId: c.id, synced: true };
    })
  );

  return results.map((r, i) =>
    r.status === "fulfilled" ? r.value : { clientId: eligible[i].id, error: r.reason?.message ?? "failed" }
  );
}
