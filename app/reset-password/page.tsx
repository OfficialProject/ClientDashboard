"use client";
import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

const CARD = "#ffffff";
const BG = "#f3f1ef";
const TEXT = "#111318";
const TEXT_DIM = "#6b7280";
const BORDER = "#e5e7eb";
const INPUT_BG = "#f9fafb";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function updatePassword() {
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSaving(true);
    const supabase = getBrowserSupabase();
    const { error: authError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    setDone(true);
    setTimeout(() => (window.location.href = "/"), 1500);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: BG }}>
      <div style={{ width: "100%", maxWidth: 400, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: "40px 32px", boxShadow: "0 10px 40px rgba(0,0,0,0.06)" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, textAlign: "center", marginBottom: 6, color: TEXT }}>
          Set a new password
        </h1>
        <p style={{ fontSize: 13, color: TEXT_DIM, textAlign: "center", marginBottom: 28 }}>
          Choose a new password for your account.
        </p>

        {done ? (
          <div style={{ fontSize: 13, color: TEXT, textAlign: "center", background: INPUT_BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "14px 16px" }}>
            Password updated - redirecting...
          </div>
        ) : (
          <>
            <label style={{ fontSize: 12, color: TEXT, fontWeight: 600, display: "block", marginBottom: 6 }}>New password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", padding: "12px 14px", fontSize: 13, marginBottom: 14, background: INPUT_BG, border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 10, boxSizing: "border-box" }}
            />
            <label style={{ fontSize: 12, color: TEXT, fontWeight: 600, display: "block", marginBottom: 6 }}>Confirm new password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && password && confirm && updatePassword()}
              style={{ width: "100%", padding: "12px 14px", fontSize: 13, marginBottom: 18, background: INPUT_BG, border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 10, boxSizing: "border-box" }}
            />
            <button
              onClick={updatePassword}
              disabled={saving || !password || !confirm}
              style={{ width: "100%", padding: "13px 16px", borderRadius: 10, border: "none", background: saving || !password || !confirm ? "#d1d5db" : "#111318", color: "#fff", fontSize: 14, fontWeight: 700, cursor: saving ? "default" : "pointer" }}
            >
              {saving ? "Saving..." : "Reset Password"}
            </button>
            {error && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 10 }}>{error}</div>}
          </>
        )}
      </div>
    </div>
  );
}
