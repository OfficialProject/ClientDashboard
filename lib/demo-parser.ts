import { Buffer } from "buffer";
import Bunzip from "seek-bzip";
import { extractMatchStats, type ParsedMatchStats } from "./demo-stats-extract";

export type { ParsedMatchStats };

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
 *
 * This browser path is now the FALLBACK/manual-reparse option - the
 * primary path is the server-side native parser running automatically in
 * the GC bot worker (lib/demo-parser-native.ts), so matches are already
 * parsed by the time anyone loads the page instead of requiring a click.
 */
async function loadWasmModule(): Promise<DemoparserWasmModule> {
  if (cachedModule) return cachedModule;

  let mod: DemoparserWasmModule;
  try {
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

/** Tick-level stats only, per the explicit "not subtick yet" scope for this pass. */
export async function parseMatchStats(demoBytes: Uint8Array): Promise<ParsedMatchStats> {
  const parser = await loadWasmModule();
  const deaths = parser.parseEvent(demoBytes, "player_death", ["steamid"], ["total_rounds_played"]);
  const hurts = parser.parseEvent(demoBytes, "player_hurt", ["steamid"], []);
  return extractMatchStats(deaths, hurts);
}
