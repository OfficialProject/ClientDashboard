import { getServerSupabase } from "@/lib/supabase/server";
import { getClient } from "@/lib/store";
import { notFound } from "next/navigation";
import OnboardingAuthCodeForm from "@/components/onboarding-auth-code-form";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({ params }: { params: { id: string } }) {
  const supabase = await getServerSupabase();
  const client = await getClient(supabase, params.id);
  if (!client) notFound();

  return (
    <main className="shell" style={{ maxWidth: 480, margin: "60px auto" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 4 }}>Step 3 of 4</div>
        <h1 style={{ fontSize: 20 }}>Connect your match history</h1>
        <p style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 8 }}>
          Steam connected as <strong>{client.steamName || client.steamId}</strong>. Two more things and your Premier
          matches start pulling in automatically - no pasting share codes by hand going forward.
        </p>
      </div>
      <OnboardingAuthCodeForm clientId={client.id} />
    </main>
  );
}
