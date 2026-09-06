export default function PlanPage() {
  return (
    <main className="shell" style={{ maxWidth: 480, margin: "60px auto" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 4 }}>Step 4 of 4</div>
        <h1 style={{ fontSize: 20 }}>Choose your plan</h1>
      </div>

      <div className="panel" style={{ marginBottom: 14 }}>
        <h2>Free</h2>
        <p style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 12 }}>
          Aim training tracking, one benchmark, manual match syncing.
        </p>
        <a href="/" className="sort-toggle">
          Continue with Free
        </a>
      </div>

      <div className="panel" style={{ border: "1px solid var(--accent)" }}>
        <h2>Pro — $12/mo</h2>
        <p style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 12 }}>
          Everything in Free, plus auto-synced Premier + FACEIT match history, unlimited goals and routines, and
          full aim + CS2 analytics.
        </p>
        <a href="/api/stripe/checkout" className="sync-button" style={{ display: "inline-block" }}>
          Subscribe to Pro
        </a>
      </div>
    </main>
  );
}
