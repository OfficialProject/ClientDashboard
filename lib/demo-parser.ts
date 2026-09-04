import { Buffer } from "buffer";
import Bunzip from "seek-bzip";

export interface ParsedMatchStats {
  players: {
    steamId: string;
    kills: number;
    deaths: number;
    headshotKills: number;
    damageDealt: number;
  }[];
  rounds: number;
}

interface DemoparserWasmModule {
  default: (input?: unknown) => Promise<unknown>; // wasm-pack --target web init()
  parseEvent: (
    file: Uint8Array,
    eventName: string,
    playerProps?: string[],
    otherProps?: string[]
  ) => Record<string, unknown>[];
  parseHeader: (file: Uint8Array) => Record<string, unknown>;
}

let cachedModule: DemoparserWasmModule | null = null;

/**
 * Dynamically loads the vendored WASM build from /public. webpackIgnore
 * keeps Next's bundler from trying to statically resolve this at build
 * time, since the file doesn't exist until the build-demoparser-wasm CI
 * workflow has run at least once (see public/vendor/demoparser2-wasm/README.md).
 * Throws a specific, catchable error in that case rather than a raw 404
 * so the UI can show something useful.
 */
async function loadWasmModule(): Promise<DemoparserWasmModule> {
  if (cachedModule) return cachedModule;

  let mod: DemoparserWasmModule;
  try {
    // A variable specifier (not a string literal) keeps TS from trying to statically
    // resolve this as a real module - only webpack needs the ignore comment, TS just
    // needs the literal-vs-variable distinction to fall back to `any`.
    const specifier = "/vendor/demoparser2-wasm/demoparser2.js";
    mod = (await import(/* webpackIgnore: true */ specifier)) as DemoparserWasmModule;
  } catch {
    throw new Error(
      "Demo parser isn't built yet - the build-demoparser-wasm GitHub Action needs to run at least once (Actions tab -> Run workflow)."
    );
  }
  await mod.default();
  cachedModule = mod;
  return mod;
}

/** Premier demo files from the GC come back bzip2-compressed. */
export function decompressDemo(compressed: ArrayBuffer): Uint8Array {
  const decoded = Bunzip.decode(Buffer.from(compressed));
  return new Uint8Array(decoded.buffer, decoded.byteOffset, decoded.byteLength);
}

/**
 * Tick-level stats only, per the explicit "not subtick yet" scope for this
 * pass - kills/deaths/headshots/damage aggregated from player_death and
 * player_hurt events, not a full duel/trade/utility engine. Field names
 * (attacker_steamid, user_steamid, dmg_health) verified against
 * LaihoE/demoparser's own examples (kda_per_zone, util_dmg), not guessed.
 */
export async function parseMatchStats(demoBytes: Uint8Array): Promise<ParsedMatchStats> {
  const parser = await loadWasmModule();

  const deaths = parser.parseEvent(demoBytes, "player_death", ["steamid"], ["total_rounds_played"]);
  const hurts = parser.parseEvent(demoBytes, "player_hurt", ["steamid"], []);

  const players = new Map<string, ParsedMatchStats["players"][number]>();
  const get = (steamId: string) => {
    if (!players.has(steamId)) {
      players.set(steamId, { steamId, kills: 0, deaths: 0, headshotKills: 0, damageDealt: 0 });
    }
    return players.get(steamId)!;
  };

  let maxRound = 0;
  for (const row of deaths) {
    const round = Number(row["total_rounds_played"] ?? 0);
    if (round > maxRound) maxRound = round;

    const attackerSteamId = String(row["attacker_steamid"] ?? "");
    const victimSteamId = String(row["user_steamid"] ?? row["steamid"] ?? "");
    const isHeadshot = Boolean(row["headshot"]);

    if (victimSteamId) get(victimSteamId).deaths++;
    if (attackerSteamId && attackerSteamId !== victimSteamId) {
      const attacker = get(attackerSteamId);
      attacker.kills++;
      if (isHeadshot) attacker.headshotKills++;
    }
  }

  for (const row of hurts) {
    const attackerSteamId = String(row["attacker_steamid"] ?? "");
    const dmg = Number(row["dmg_health"] ?? 0);
    if (attackerSteamId && dmg > 0) get(attackerSteamId).damageDealt += dmg;
  }

  return { players: Array.from(players.values()), rounds: maxRound };
}
