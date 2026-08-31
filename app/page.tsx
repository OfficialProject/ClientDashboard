import { listClients } from "@/lib/store";
import ClientRoster from "@/components/client-roster";
import AddClient from "@/components/add-client";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await listClients();
  return (
    <main className="shell">
      <div className="topbar">
        <div className="brand">AIM COACH</div>
        <AddClient />
      </div>
      <ClientRoster clients={clients} />
    </main>
  );
}
