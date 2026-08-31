"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { Client } from "@/lib/types";

export default function ClientRoster({ clients }: { clients: Client[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.nickname.toLowerCase().includes(q) || c.steamName.toLowerCase().includes(q)
    );
  }, [clients, query]);

  return (
    <>
      <div className="searchbar" style={{ marginBottom: 16 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <input
          placeholder="Find a client..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          {clients.length === 0
            ? "No clients yet. Add one to get started."
            : "No clients match that search."}
        </div>
      ) : (
        <div className="roster-grid">
          {filtered.map((c) => {
            const history = c.assignedBenchmarkId
              ? c.benchmarkHistory[c.assignedBenchmarkId]
              : undefined;
            const progress = history?.at(-1);
            return (
              <Link key={c.id} href={`/client/${c.id}`} className="client-card">
                <img src={c.avatar} alt="" />
                <div className="nickname">{c.nickname}</div>
                <div className="steamname">{c.steamName}</div>
                <div className="rank-row">
                  {progress && <span className="rank-chip viscose">{progress.overallRankName}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
