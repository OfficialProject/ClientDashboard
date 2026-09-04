"use client";
import { useEffect, useState } from "react";

/**
 * Renders nothing during SSR and the actual server's markup, then swaps in
 * the real locale-formatted string after mount, once React is running
 * client-side only. Formatting a date directly in JSX (new
 * Date(x).toLocaleString()) breaks the moment the server and the visitor's
 * browser are in different timezones, because SSR bakes in the server's
 * timezone but hydration re-runs the same code in the browser's - "Text
 * content does not match server-rendered HTML" is that mismatch, not a bug
 * in the date logic itself.
 */
export default function LocalTime({
  iso,
  format = "datetime",
}: {
  iso: string;
  format?: "datetime" | "date" | "time";
}) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    const date = new Date(iso);
    setText(
      format === "date"
        ? date.toLocaleDateString()
        : format === "time"
          ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : date.toLocaleString()
    );
  }, [iso, format]);

  // Placeholder keeps layout stable instead of popping in after mount.
  return <>{text ?? "…"}</>;
}
