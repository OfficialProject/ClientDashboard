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

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function signUp() {
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSending(true);
    const supabase = getBrowserSupabase();
    const { error: authError, data } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setSending(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    if (data.session) {
      window.location.href = "/api/auth/steam/login";
      return;
    }
    setSent(true);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: BG }}>
      <div style={{ width: "100%", maxWidth: 400, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: "40px 32px", boxShadow: "0 10px 40px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "radial-gradient(circle at 35% 30%, #7dd3c8, #0f766e)", boxShadow: "0 8px 24px rgba(15,118,110,0.25)" }} />
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, textAlign: "center", marginBottom: 6, color: TEXT }}>
          Create your account
        </h1>
        <p style={{ fontSize: 13, color: TEXT_DIM, textAlign: "center", marginBottom: 28 }}>
          Start tracking your training and matches.
        </p>

        {sent ? (
          <div style={{ fontSize: 13, color: TEXT, textAlign: "center", background: INPUT_BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "14px 16px" }}>
            Check your email to confirm your account.
          </div>
        ) : (
          <>
            <label style={{ fontSize: 12, color: TEXT, fontWeight: 600, display: "block", marginBottom: 6 }}>Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: "100%", padding: "12px 14px", fontSize: 13, marginBottom: 14, background: INPUT_BG, border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 10, boxSizing: "border-box" }}
            />
            <label style={{ fontSize: 12, color: TEXT, fontWeight: 600, display: "block", marginBottom: 6 }}>Password</label>
            <input
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", padding: "12px 14px", fontSize: 13, marginBottom: 14, background: INPUT_BG, border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 10, boxSizing: "border-box" }}
            />
            <label style={{ fontSize: 12, color: TEXT, fontWeight: 600, display: "block", marginBottom: 6 }}>Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && email && password && confirm && signUp()}
              style={{ width: "100%", padding: "12px 14px", fontSize: 13, marginBottom: 18, background: INPUT_BG, border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 10, boxSizing: "border-box" }}
            />
            <button
              onClick={signUp}
              disabled={sending || !email || !password || !confirm}
              style={{ width: "100%", padding: "13px 16px", borderRadius: 10, border: "none", background: sending || !email || !password || !confirm ? "#d1d5db" : "#111318", color: "#fff", fontSize: 14, fontWeight: 700, cursor: sending ? "default" : "pointer" }}
            >
              {sending ? "Creating account..." : "Sign Up"}
            </button>
            {error && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 10 }}>{error}</div>}
          </>
        )}

        <div style={{ textAlign: "center", fontSize: 12, color: TEXT_DIM, marginTop: 22 }}>
          Already have an account?{" "}
          <a href="/login" style={{ color: LINK, fontWeight: 600, textDecoration: "none" }}>
            Sign in
          </a>
        </div>
      </div>
    </div>
  );
}
