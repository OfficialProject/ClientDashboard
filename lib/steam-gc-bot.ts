import SteamUser from "steam-user";
import GlobalOffensive from "globaloffensive";
import SteamTotp from "steam-totp";

export interface ResolvedDemo {
  demoUrl: string | null;
  map: string | null;
}

/**
 * Wraps one logged-in Steam bot account + its CS2 Game Coordinator
 * session. One instance = one bot. This exists because Premier match
 * history and demo URLs are not available over a normal API - Valve only
 * hands them to a live game client talking to the GC, so this class
 * impersonates one.
 *
 * NOT LIVE-TESTED: written in a sandbox with no network path to Steam's
 * CM/GC servers (fixed domain allowlist, Steam isn't on it) and no bot
 * account configured here. Treat the first real login as a smoke test,
 * same as every other external integration in this codebase - budget
 * time for it not working on the first try. In particular: Steam Guard
 * flows (email code / mobile confirmation) can still interrupt a login
 * even with a shared secret configured, and that path isn't exercised
 * here at all.
 *
 * Known quirk this code depends on (documented across every GC-based CS
 * demo downloader that exists, not a guess made up for this app): the
 * `map` field on the LAST entry of a match's `roundstatsall` actually
 * contains the signed demo download URL once the match is fully
 * reported, not a map name, despite the field name.
 */
export class SteamGCBot {
  private user: SteamUser;
  private csgo: GlobalOffensive;
  private ready: Promise<void>;
  private resolveReady!: () => void;
  private rejectReady!: (err: Error) => void;
  private settled = false;

  constructor() {
    this.user = new SteamUser();
    this.csgo = new GlobalOffensive(this.user);
    this.ready = new Promise((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    this.wireEvents();
  }

  private wireEvents() {
    this.user.on("loggedOn", () => {
      this.user.gamesPlayed([730]); // "launch" CS2 so a GC session can establish
    });
    this.user.on("error", (err) => {
      if (!this.settled) {
        this.settled = true;
        this.rejectReady(err instanceof Error ? err : new Error(String(err)));
      }
    });
    this.csgo.on("connectedToGC", () => {
      this.settled = true;
      this.resolveReady();
    });
    this.csgo.on("connectionStatus", (status: number) => {
      if (status === GlobalOffensive.GCConnectionStatus.NO_STEAM) {
        console.error("[steam-gc-bot] lost the underlying Steam connection");
      }
    });
  }

  async login(): Promise<void> {
    const accountName = process.env.STEAM_BOT_USERNAME;
    const password = process.env.STEAM_BOT_PASSWORD;
    const sharedSecret = process.env.STEAM_BOT_SHARED_SECRET; // mobile authenticator shared secret, used to generate the 2FA code
    if (!accountName || !password) {
      throw new Error("STEAM_BOT_USERNAME and STEAM_BOT_PASSWORD are not configured.");
    }
    this.user.logOn({
      accountName,
      password,
      twoFactorCode: sharedSecret ? SteamTotp.generateAuthCode(sharedSecret) : undefined,
    });
    await this.ready;
  }

  logout(): void {
    this.user.logOff();
  }

  /** Resolves a match share code (e.g. "CSGO-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx") to its demo URL via the GC. */
  async resolveDemoUrl(shareCode: string, timeoutMs = 20000): Promise<ResolvedDemo> {
    if (!this.csgo.haveGCSession) throw new Error("No active GC session - call login() first.");

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.csgo.removeListener("matchList", onMatchList);
        reject(new Error(`GC did not respond to requestGame for ${shareCode} within ${timeoutMs}ms`));
      }, timeoutMs);

      const onMatchList = (matches: GlobalOffensive.Match[]) => {
        clearTimeout(timer);
        this.csgo.removeListener("matchList", onMatchList);

        const match = matches[0];
        if (!match || match.roundstatsall.length === 0) {
          resolve({ demoUrl: null, map: null });
          return;
        }
        const finalRound = match.roundstatsall[match.roundstatsall.length - 1];
        // See class doc: `map` on the final round entry holds the demo URL, not a map name.
        resolve({ demoUrl: finalRound.map, map: match.watchablematchinfo?.game_map ?? null });
      };

      this.csgo.on("matchList", onMatchList);
      this.csgo.requestGame(shareCode);
    });
  }
}
