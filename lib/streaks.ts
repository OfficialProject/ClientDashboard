import type { Session } from "./sessions";

export interface StreakStats {
  currentStreak: number; // consecutive days up to and including today or yesterday
  longestStreak: number;
}

function dateKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10); // YYYY-MM-DD, local-timezone drift ignored (same tradeoff as timeAgo elsewhere)
}

export function computeStreak(sessions: Session[]): StreakStats {
  if (sessions.length === 0) return { currentStreak: 0, longestStreak: 0 };

  const dayMs = 24 * 60 * 60 * 1000;
  const uniqueDays = Array.from(new Set(sessions.map((s) => dateKey(s.end))))
    .map((d) => new Date(d).getTime())
    .sort((a, b) => b - a); // newest first

  // Current streak: count back from today (or yesterday, so a day still in
  // progress doesn't reset the streak to 0 before it's even over).
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let currentStreak = 0;
  let cursor = today.getTime();
  const daySet = new Set(uniqueDays);
  // Allow the streak to "start" from yesterday if today has no session yet.
  if (!daySet.has(cursor) && daySet.has(cursor - dayMs)) {
    cursor -= dayMs;
  }
  while (daySet.has(cursor)) {
    currentStreak++;
    cursor -= dayMs;
  }

  // Longest streak: scan all unique days (oldest to newest) for the longest run of consecutive days.
  const ascending = [...uniqueDays].sort((a, b) => a - b);
  let longestStreak = 0;
  let run = 0;
  let prevDay: number | null = null;
  for (const d of ascending) {
    if (prevDay !== null && d - prevDay === dayMs) {
      run++;
    } else {
      run = 1;
    }
    longestStreak = Math.max(longestStreak, run);
    prevDay = d;
  }

  return { currentStreak, longestStreak: Math.max(longestStreak, currentStreak) };
}
