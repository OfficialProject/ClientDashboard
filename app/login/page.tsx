"use client";
import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function sendMagicLink() {
    setSending(true);
    setError("");
    const supabase = getBrowserSupabase();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setSending(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    setSent(true);
  }

  return (
    <div style={{ maxWidth: 360, margin: "80px auto", padding: 24 }}>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>Sign in</h1>
      {sent ? (
        <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
          Check your email for a sign-in link.
        </div>
      ) : (
        <>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              fontSize: 13,
              marginBottom: 10,
              background: "var(--panel-alt)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              borderRadius: 8,
              boxSizing: "border-box",
            }}
          />
          <button className="sync-button" onClick={sendMagicLink} disabled={sending || !email}>
            {sending ? "Sending..." : "Send magic link"}
          </button>
          {error && <div style={{ color: "var(--danger, #f87171)", fontSize: 12, marginTop: 8 }}>{error}</div>}
        </>
      )}
    </div>
  );
}
