import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/database.types";

export async function getPostAuthRedirect(supabase: SupabaseClient<Database>): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "/login";

  const { count } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);

  return count ? "/" : "/api/auth/steam/login";
}
