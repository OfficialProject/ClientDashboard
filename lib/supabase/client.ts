import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/**
 * persist=false backs the session with sessionStorage instead of
 * localStorage, so it clears when the browser/tab closes - the real
 * mechanism behind a "Remember me" checkbox, not just a label with no
 * effect. persist=true (default) is normal localStorage persistence.
 */
export function getBrowserSupabase(persist: boolean = true) {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    persist
      ? undefined
      : {
          auth: {
            storage: typeof window !== "undefined" ? window.sessionStorage : undefined,
          },
        }
  );
}
