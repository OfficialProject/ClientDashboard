import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Bypasses RLS - only ever use this from trusted server-side code that
 * isn't acting on behalf of one specific logged-in user (background
 * workers, cron jobs). Never expose SUPABASE_SERVICE_ROLE_KEY to the
 * browser or import this file from anything that runs client-side.
 */
export function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for worker processes.");
  }
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}
