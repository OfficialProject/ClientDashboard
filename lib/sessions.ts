import type { RecentActivityEntry } from "./kovaaks";

export interface Session {
  start: string;
  end: string;
  entries: RecentActivityEntry[];
}

/**
 * Groups entries into sessions by timestamp proximity - not a true
 * multi-attempt log (our data is "best score per scenario," one point
 * each), so this is really "scenarios whose current best was set around
 * the same time," inferred as a session. Worth keeping that distinction
 * visible rather than presenting it as an exhaustive per-attempt session
 * log, which this genuinely isn't.
 */
export function groupIntoSessions(
  entries: RecentActivityEntry[],
  gapMinutes = 45
): Session[] {
  if (entries.length === 0) return [];
  const sorted = [...entries].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const sessions: Session[] = [];
  let current: RecentActivityEntry[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prevTime = new Date(sorted[i - 1].timestamp).getTime();
    const thisTime = new Date(sorted[i].timestamp).getTime();
    const gapMs = prevTime - thisTime; // sorted desc, so this is always >= 0
    if (gapMs <= gapMinutes * 60 * 1000) {
      current.push(sorted[i]);
    } else {
      sessions.push(toSession(current));
      current = [sorted[i]];
    }
  }
  sessions.push(toSession(current));
  return sessions;
}

function toSession(entries: RecentActivityEntry[]): Session {
  return {
    start: entries[entries.length - 1].timestamp,
    end: entries[0].timestamp,
    entries,
  };
}

export interface ConsistencyStats {
  daysSinceLastSession: number | null;
  sessionsLast7Days: number;
  sessionsLast30Days: number;
}

export function computeConsistency(sessions: Session[]): ConsistencyStats {
  if (sessions.length === 0) {
    return { daysSinceLastSession: null, sessionsLast7Days: 0, sessionsLast30Days: 0 };
  }
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const daysSinceLastSession = Math.floor((now - new Date(sessions[0].end).getTime()) / dayMs);
  const sessionsLast7Days = sessions.filter(
    (s) => now - new Date(s.end).getTime() <= 7 * dayMs
  ).length;
  const sessionsLast30Days = sessions.filter(
    (s) => now - new Date(s.end).getTime() <= 30 * dayMs
  ).length;
  return { daysSinceLastSession, sessionsLast7Days, sessionsLast30Days };
}
