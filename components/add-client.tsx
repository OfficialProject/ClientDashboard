"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { parseSteamInput } from "@/lib/parse-steam-input";

interface SteamPreview {
  steamId: string;
  steamName: string;
  avatar: string;
}

export default function AddClient() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [nickname, setNickname] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<SteamPreview | null>(null);
  const [saving, setSaving] = useState(false);

  function reset() {
    setIdentifier("");
    setNickname("");
    setStatus("");
    setPreview(null);
  }

  async function lookup(event: FormEvent) {
    event.preventDefault();
    const parsed = parseSteamInput(identifier);
    if (!parsed) return setStatus("Enter a Steam ID, vanity name, or profile URL.");

    setLoading(true);
    setStatus("Looking up Steam...");
    setPreview(null);

    let steamId = parsed.type === "steamid64" ? parsed.value : null;
    if (!steamId) {
      const resolved = await fetch(`/api/steam/resolve?vanity=${encodeURIComponent(parsed.value)}`);
      const data = await resolved.json();
      if (!resolved.ok) {
        setLoading(false);
        return setStatus(data.error ?? "Steam resolve failed.");
      }
      steamId = data.steamId;
    }

    const playerRes = await fetch(`/api/steam/player?steamid=${encodeURIComponent(steamId!)}`);
    const playerData = await playerRes.json();
    setLoading(false);
    if (!playerRes.ok) return setStatus(playerData.error ?? "Steam lookup failed.");
    setPreview(playerData);
    setStatus("Ready to add.");
  }

  async function save() {
    if (!preview) return;
    setSaving(true);
    setStatus("Saving...");
    const response = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nickname: nickname.trim() || preview.steamName,
        steamId: preview.steamId,
        steamName: preview.steamName,
        avatar: preview.avatar,
      }),
    });
    setSaving(false);
    if (!response.ok) {
      const data = await response.json();
      return setStatus(data.error ?? "Save failed.");
    }
    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <>
      <button className="add-button" onClick={() => setOpen(true)}>
        + Client
      </button>
      {open && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setOpen(false);
            reset();
          }}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <strong>Add client</strong>
              <button
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
              >
                ×
              </button>
            </div>
            <form onSubmit={lookup}>
              <label>
                Steam ID, Vanity ID, or Profile URL
                <input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="76561198... / vanity name / steamcommunity.com/id/..."
                  autoFocus
                />
              </label>
              <label>
                Nickname (optional — defaults to their Steam name)
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="What you call them"
                />
              </label>
              <button className="primary" type="submit" disabled={loading}>
                {loading ? "Looking up..." : "Look up"}
              </button>
            </form>

            {preview && (
              <div className="steam-preview">
                <img src={preview.avatar} alt="" />
                <div>
                  <strong>{nickname || preview.steamName}</strong>
                  <div className="sub">{preview.steamName}</div>
                </div>
              </div>
            )}

            {preview && (
              <button
                className="primary"
                style={{ marginTop: 12, width: "100%" }}
                onClick={save}
                disabled={saving}
              >
                {saving ? "Adding..." : "Add to roster"}
              </button>
            )}
            <div className="modal-status">{status}</div>
          </div>
        </div>
      )}
    </>
  );
}
