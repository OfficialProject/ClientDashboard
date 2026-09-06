import { getServerSupabase } from "@/lib/supabase/server";
import { listClients } from "@/lib/store";
import ClientRoster from "@/components/client-roster";
import AddClient from "@/components/add-client";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const supabase = await getServerSupabase();
  const clients = await listClients(supabase);
  return (
    <main className="shell">
      <div className="topbar">
        <div className="brand">AIM COACH</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <a href="/api/auth/steam/login" className="sort-toggle" style={{ fontSize: 12 }}>
            Connect Steam
          </a>
          <a href="/api/auth/logout" className="sort-toggle" style={{ fontSize: 12 }}>
            Log out
          </a>
          <AddClient />
        </div>
      </div>
      <ClientRoster clients={clients} />
    </main>
  );
}
