import { getServerSupabase } from "@/lib/supabase/server";
import { getClient } from "@/lib/store";
import { notFound } from "next/navigation";
import Link from "next/link";
import ClientDetail from "@/components/client-detail";

export const dynamic = "force-dynamic";

export default async function ClientPage({ params }: { params: { id: string } }) {
  const supabase = await getServerSupabase();
  const client = await getClient(supabase, params.id);
  if (!client) notFound();

  return (
    <main className="shell">
      <Link href="/" className="back-link">
        ← Roster
      </Link>
      <ClientDetail client={client} />
    </main>
  );
}
