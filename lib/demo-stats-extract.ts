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

/**
 * Field names (attacker_steamid, user_steamid, dmg_health, headshot,
 * total_rounds_played) verified against LaihoE/demoparser's own examples
 * (kda_per_zone, util_dmg), not guessed - same verification this codebase
 * got burned skipping once already (see the FACEIT map-field bug).
 */
export function extractMatchStats(
  deaths: Record<string, unknown>[],
  hurts: Record<string, unknown>[]
): ParsedMatchStats {
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
