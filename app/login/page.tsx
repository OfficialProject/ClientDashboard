"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";

const CARD = "#ffffff";
const BG = "#f3f1ef";
const TEXT = "#111318";
const TEXT_DIM = "#6b7280";
const BORDER = "#e5e7eb";
const INPUT_BG = "#f9fafb";
const LINK = "#4f46e5";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function signIn() {
    setSigningIn(true);
    setError("");
    const supabase = getBrowserSupabase(remember);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setSigningIn(false);
      setError(authError.message === "Invalid login credentials" ? "Incorrect email or password." : authError.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function signInWithGoogle() {
    setGoogleLoading(true);
    setError("");
    const supabase = getBrowserSupabase();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (authError) {
      setGoogleLoading(false);
      setError(authError.message);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: BG }}>
      <div style={{ width: "100%", maxWidth: 400, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: "40px 32px", boxShadow: "0 10px 40px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "radial-gradient(circle at 35% 30%, #7dd3c8, #0f766e)", boxShadow: "0 8px 24px rgba(15,118,110,0.25)" }} />
        </div>

        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, textAlign: "center", marginBottom: 6, color: TEXT }}>
          Welcome back
        </h1>
        <p style={{ fontSize: 13, color: TEXT_DIM, textAlign: "center", marginBottom: 28 }}>
          Sign in to your account.
        </p>

        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <button
            onClick={signInWithGoogle}
            disabled={googleLoading}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 10px", borderRadius: 10, border: `1px solid ${BORDER}`, background: "#fff", color: TEXT, fontSize: 13, fontWeight: 600, cursor: googleLoading ? "default" : "pointer" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.82z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A12 12 0 0 0 12 24z" />
              <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.39l4-3.11z" />
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.61l4 3.11C6.22 6.86 8.87 4.75 12 4.75z" />
            </svg>
            Google
          </button>
          <a
            href="/api/auth/steam/login"
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 10px", borderRadius: 10, border: `1px solid ${BORDER}`, background: "#fff", color: TEXT, fontSize: 13, fontWeight: 600, textDecoration: "none" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#111318" aria-hidden>
              <path d="M11.979 0C5.678 0 0.511 4.86 0.022 11.037l6.432 2.658a3.386 3.386 0 0 1 1.923-.593c.064 0 .128.002.19.006l2.861-4.142v-.06c0-2.52 2.04-4.564 4.552-4.564 2.512 0 4.552 2.044 4.552 4.564 0 2.52-2.04 4.564-4.552 4.564h-.105l-4.077 2.911c0 .052.003.104.003.157 0 1.918-1.552 3.474-3.463 3.474-1.674 0-3.07-1.205-3.398-2.793L.545 15.7C1.984 20.393 6.567 24 11.979 24 18.615 24 24 18.627 24 11.999 24 5.373 18.615 0 11.979 0zM7.54 18.21l-1.473-.61a2.6 2.6 0 0 0 2.396 1.577 2.6 2.6 0 0 0 2.598-2.6 2.6 2.6 0 0 0-2.598-2.6c-.298 0-.581.056-.845.153l1.522.63a1.92 1.92 0 0 1-1.47 3.55zm10.05-9.66a3.04 3.04 0 0 0-3.038-3.043 3.045 3.045 0 0 0 0 6.086 3.04 3.04 0 0 0 3.038-3.043zm-5.316-.003a2.286 2.286 0 1 1 4.573.002 2.286 2.286 0 0 1-4.573-.002z" />
            </svg>
            Steam
          </a>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0 20px" }}>
          <div style={{ flex: 1, height: 1, background: BORDER }} />
          <span style={{ fontSize: 11, color: TEXT_DIM, letterSpacing: 0.5 }}>OR</span>
          <div style={{ flex: 1, height: 1, background: BORDER }} />
        </div>

        <label style={{ fontSize: 12, color: TEXT, fontWeight: 600, display: "block", marginBottom: 6 }}>Email address</label>
        <input
          type="email"
          placeholder="Enter your email..."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: "12px 14px", fontSize: 13, marginBottom: 14, background: INPUT_BG, border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 10, boxSizing: "border-box" }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <label style={{ fontSize: 12, color: TEXT, fontWeight: 600 }}>Password</label>
          <a href="/forgot-password" style={{ fontSize: 12, color: LINK, textDecoration: "none" }}>
            Forgot password?
          </a>
        </div>
        <input
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && email && password && signIn()}
          style={{ width: "100%", padding: "12px 14px", fontSize: 13, marginBottom: 12, background: INPUT_BG, border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 10, boxSizing: "border-box" }}
        />

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: TEXT_DIM, marginBottom: 18, cursor: "pointer" }}>
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Remember me
        </label>

        <button
          onClick={signIn}
          disabled={signingIn || !email || !password}
          style={{ width: "100%", padding: "13px 16px", borderRadius: 10, border: "none", background: signingIn || !email || !password ? "#d1d5db" : "#111318", color: "#fff", fontSize: 14, fontWeight: 700, cursor: signingIn || !email || !password ? "default" : "pointer" }}
        >
          {signingIn ? "Signing in..." : "Sign In"}
        </button>
        {error && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 10 }}>{error}</div>}

        <div style={{ textAlign: "center", fontSize: 12, color: TEXT_DIM, marginTop: 22 }}>
          Don&apos;t have an account?{" "}
          <a href="/signup" style={{ color: LINK, fontWeight: 600, textDecoration: "none" }}>
            Sign up
          </a>
        </div>
      </div>
    </div>
  );
}
