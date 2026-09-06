"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingAuthCodeForm({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [authCode, setAuthCode] = useState("");
  const [shareCode, setShareCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        steamAuthCode: authCode.trim() || null,
        lastKnownShareCode: shareCode.trim() || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error ?? "Failed to save");
      return;
    }
    router.push(`/onboarding/plan`);
  }

  return (
    <div>
      <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 16, lineHeight: 1.5 }}>
        In CS2: Settings → Game → enable match history authentication. Copy the auth code shown there, then grab any
        recent match's share code from Watch → Your Matches to give us a starting point.
      </div>
      <label style={{ fontSize: 11, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>Match history auth code</label>
      <input
        value={authCode}
        onChange={(e) => setAuthCode(e.target.value)}
        style={{ width: "100%", background: "var(--panel-alt)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 14, boxSizing: "border-box" }}
      />
      <label style={{ fontSize: 11, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>Most recent match share code</label>
      <input
        placeholder="CSGO-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx"
        value={shareCode}
        onChange={(e) => setShareCode(e.target.value)}
        style={{ width: "100%", background: "var(--panel-alt)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 14, boxSizing: "border-box" }}
      />
      {error && <div style={{ color: "var(--danger, #f87171)", fontSize: 12, marginBottom: 10 }}>{error}</div>}
      <div style={{ display: "flex", gap: 10 }}>
        <button className="sync-button" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Continue"}
        </button>
        <button
          className="sort-toggle"
          onClick={() => router.push(`/onboarding/plan`)}
          disabled={saving}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
