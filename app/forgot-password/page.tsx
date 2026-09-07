"use client";
import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

const CARD = "#ffffff";
const BG = "#f3f1ef";
const TEXT = "#111318";
const TEXT_DIM = "#6b7280";
const BORDER = "#e5e7eb";
const INPUT_BG = "#f9fafb";
const LINK = "#4f46e5";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function sendReset() {
    setSending(true);
    setError("");
    const supabase = getBrowserSupabase();
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });
    setSending(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    setSent(true);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: BG }}>
      <div style={{ width: "100%", maxWidth: 400, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: "40px 32px", boxShadow: "0 10px 40px rgba(0,0,0,0.06)" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, textAlign: "center", marginBottom: 6, color: TEXT }}>
          Reset your password
        </h1>
        <p style={{ fontSize: 13, color: TEXT_DIM, textAlign: "center", marginBottom: 28 }}>
          We&apos;ll email you a link to set a new one.
        </p>

        {sent ? (
          <div style={{ fontSize: 13, color: TEXT, textAlign: "center", background: INPUT_BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "14px 16px" }}>
            Check your email for a reset link.
          </div>
        ) : (
          <>
            <label style={{ fontSize: 12, color: TEXT, fontWeight: 600, display: "block", marginBottom: 6 }}>Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && email && sendReset()}
              style={{ width: "100%", padding: "12px 14px", fontSize: 13, marginBottom: 18, background: INPUT_BG, border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 10, boxSizing: "border-box" }}
            />
            <button
              onClick={sendReset}
              disabled={sending || !email}
              style={{ width: "100%", padding: "13px 16px", borderRadius: 10, border: "none", background: sending || !email ? "#d1d5db" : "#111318", color: "#fff", fontSize: 14, fontWeight: 700, cursor: sending ? "default" : "pointer" }}
            >
              {sending ? "Sending..." : "Send reset link"}
            </button>
            {error && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 10 }}>{error}</div>}
          </>
        )}

        <div style={{ textAlign: "center", fontSize: 12, color: TEXT_DIM, marginTop: 22 }}>
          <a href="/login" style={{ color: LINK, fontWeight: 600, textDecoration: "none" }}>
            Back to sign in
          </a>
        </div>
      </div>
    </div>
  );
}
