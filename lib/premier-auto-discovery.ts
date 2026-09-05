import { listClients, updateClient } from "./store";
import { getNextMatchSharingCode } from "./steam-web-api";
import { enqueueJob } from "./premier-jobs-store";

export interface PremierDiscoveryResult {
  clientId: string;
  newJobsEnqueued: number;
  error?: string;
}

const MAX_CODES_PER_CLIENT_PER_RUN = 5; // caps one client's backlog from starving the others in a single pass

export async function autoDiscoverPremierMatches(): Promise<PremierDiscoveryResult[]> {
  const clients = await listClients();
  const eligible = clients.filter((c) => c.steamAuthCode && c.lastKnownShareCode);

  const results: PremierDiscoveryResult[] = [];
  for (const client of eligible) {
    let enqueued = 0;
    let knownCode = client.lastKnownShareCode as string;
    try {
      for (let i = 0; i < MAX_CODES_PER_CLIENT_PER_RUN; i++) {
        const { nextCode } = await getNextMatchSharingCode(client.steamId, client.steamAuthCode as string, knownCode);
        if (!nextCode) break;
        await enqueueJob(client.id, nextCode);
        knownCode = nextCode;
        enqueued++;
      }
      if (enqueued > 0) {
        await updateClient(client.id, { lastKnownShareCode: knownCode });
      }
      results.push({ clientId: client.id, newJobsEnqueued: enqueued });
    } catch (err) {
      results.push({
        clientId: client.id,
        newJobsEnqueued: enqueued,
        error: err instanceof Error ? err.message : "discovery failed",
      });
    }
  }
  return results;
}
